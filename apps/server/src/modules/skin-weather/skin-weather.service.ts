import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { sendPushToUser } from '../push/push.service';
import { startOfDay } from 'date-fns';

// ── Profile ───────────────────────────────────────────────────────────────────

export const getProfile = async (userId: string) => {
  return prisma.skinWeatherProfile.findUnique({ where: { userId } });
};

export const upsertProfile = async (
  userId: string,
  data: {
    skinType: string;
    skinConcerns?: string[];
    locationLat: number;
    locationLng: number;
    cityName: string;
    notificationsEnabled?: boolean;
  },
) => {
  return prisma.skinWeatherProfile.upsert({
    where: { userId },
    update: {
      skinType: data.skinType as any,
      skinConcerns: data.skinConcerns ?? [],
      locationLat: data.locationLat,
      locationLng: data.locationLng,
      cityName: data.cityName,
      notificationsEnabled: data.notificationsEnabled ?? false,
    },
    create: {
      userId,
      skinType: data.skinType as any,
      skinConcerns: data.skinConcerns ?? [],
      locationLat: data.locationLat,
      locationLng: data.locationLng,
      cityName: data.cityName,
      notificationsEnabled: data.notificationsEnabled ?? false,
    },
  });
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const getTodayReport = async (userId: string) => {
  const today = startOfDay(new Date());
  return prisma.skinWeatherReport.findUnique({
    where: { userId_reportDate: { userId, reportDate: today } },
  });
};

export const getReportHistory = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.skinWeatherReport.findMany({
      where: { userId },
      orderBy: { reportDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.skinWeatherReport.count({ where: { userId } }),
  ]);
  return { data, totalPages: Math.ceil(total / limit) };
};

// ── Rules (admin) ─────────────────────────────────────────────────────────────

export const getRules = async () => {
  return prisma.skinWeatherRule.findMany({ orderBy: { sortOrder: 'asc' } });
};

interface WeatherData {
  temperature: number; // °C raw
  uv: number;          // UV index 0–11+
  precip: number;      // precipitation probability % 0–100
  humidity: number;    // relative humidity % 0–100
  aqi: number;         // EU AQI 0–300
}

type ParamKey = 'temperature' | 'uv' | 'humidity' | 'aqi' | 'precip';

type ParamRange = { min: number; max: number };
type RangeThresholds = Partial<Record<ParamKey, ParamRange>>;

type RuleParams = {
  label: string;
  recommendation: string;
  sortOrder?: number;
  isActive?: boolean;
  conditions?: ParamKey[];
  thresholds?: RangeThresholds;
};

export const createRule = async (data: RuleParams) => {
  return prisma.skinWeatherRule.create({
    data: {
      label: data.label,
      recommendation: data.recommendation,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      conditions: data.conditions ?? [],
      thresholds: data.thresholds ?? {},
    },
  });
};

export const updateRule = async (id: string, data: Partial<RuleParams>) => {
  const rule = await prisma.skinWeatherRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('Reguła nie znaleziona', 404);
  const updateData: Partial<RuleParams> = {};
  if (data.label !== undefined)          updateData.label = data.label;
  if (data.recommendation !== undefined) updateData.recommendation = data.recommendation;
  if (data.sortOrder !== undefined)      updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined)       updateData.isActive = data.isActive;
  if (data.conditions !== undefined)     updateData.conditions = data.conditions;
  if (data.thresholds !== undefined)     (updateData as any).thresholds = data.thresholds;
  return prisma.skinWeatherRule.update({ where: { id }, data: updateData as any });
};


// Update only location fields (called automatically from frontend on each visit)
export const updateProfileLocation = async (
  userId: string,
  data: { locationLat: number; locationLng: number; cityName: string },
) => {
  const existing = await prisma.skinWeatherProfile.findUnique({ where: { userId } });
  if (!existing) return null; // no profile yet — skip silently
  return prisma.skinWeatherProfile.update({
    where: { userId },
    data: { locationLat: data.locationLat, locationLng: data.locationLng, cityName: data.cityName },
  });
};

// Generate report for a single user on demand
export const generateReportForUser = async (userId: string, force = false) => {
  const today = startOfDay(new Date());
  const profile = await prisma.skinWeatherProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError('Brak profilu pogodowego. Ustaw najpierw lokalizację.', 400);

  const existing = await prisma.skinWeatherReport.findUnique({
    where: { userId_reportDate: { userId, reportDate: today } },
  });
  if (existing && !force) return existing;
  if (existing && force) {
    await prisma.skinWeatherReport.delete({ where: { userId_reportDate: { userId, reportDate: today } } });
  }

  const rules = await prisma.skinWeatherRule.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const lat = Number(profile.locationLat);
  const lng = Number(profile.locationLng);

  const [weather, airQuality] = await Promise.all([fetchWeather(lat, lng), fetchAirQuality(lat, lng)]);
  const sections = matchRulesToWeather(rules, weather, airQuality);

  return prisma.skinWeatherReport.create({
    data: {
      userId,
      reportDate: today,
      weatherData: weather,
      reportData: { sections },
    },
  });
};

export const deleteRule = async (id: string) => {
  const rule = await prisma.skinWeatherRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('Reguła nie znaleziona', 404);
  await prisma.skinWeatherRule.delete({ where: { id } });
};

// ── Weather fetching ──────────────────────────────────────────────────────────

const fetchWeather = async (lat: number, lng: number) => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation_probability,uv_index` +
    `&timezone=Europe/Warsaw`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo weather fetch failed: ${res.status}`);
  return res.json();
};

const fetchAirQuality = async (lat: number, lng: number) => {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
    `&current=european_aqi&timezone=Europe/Warsaw`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo AQI fetch failed: ${res.status}`);
  return res.json();
};

function buildWeatherData(weather: any, airQuality: any): WeatherData {
  return {
    temperature: weather?.current?.temperature_2m ?? 20,
    uv:          weather?.current?.uv_index ?? 0,
    precip:      weather?.current?.precipitation_probability ?? 0,
    humidity:    weather?.current?.relative_humidity_2m ?? 50,
    aqi:         airQuality?.current?.european_aqi ?? 0,
  };
}

function getParamValue(param: ParamKey, w: WeatherData): number {
  switch (param) {
    case 'temperature': return w.temperature;
    case 'uv':          return w.uv;
    case 'humidity':    return w.humidity;
    case 'aqi':         return w.aqi;
    case 'precip':      return w.precip;
    default:            return 0;
  }
}

function checkRange(param: ParamKey, range: ParamRange, w: WeatherData): boolean {
  const val = getParamValue(param, w);
  return val >= range.min && val <= range.max;
}

const matchRulesToWeather = (rules: any[], weather: any, airQuality: any) => {
  const w = buildWeatherData(weather, airQuality);
  return rules
    .filter(r => r.isActive && r.conditions.length > 0)
    .filter(r => {
      const ranges = (r.thresholds ?? {}) as RangeThresholds;
      return (r.conditions as ParamKey[]).every(param => {
        const range = ranges[param];
        if (!range) return false;
        return checkRange(param, range, w);
      });
    })
    .map(r => ({ label: r.label, recommendation: r.recommendation }));
};

// ── Scheduler ─────────────────────────────────────────────────────────────────

export const processSkinWeatherReports = async () => {
  console.log('[SkinWeather] Processing daily reports...');
  const today = startOfDay(new Date());

  const profiles = await prisma.skinWeatherProfile.findMany();
  if (profiles.length === 0) {
    console.log('[SkinWeather] No profiles found, skipping.');
    return;
  }

  const rules = await prisma.skinWeatherRule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  for (const profile of profiles) {
    try {
      const existing = await prisma.skinWeatherReport.findUnique({
        where: { userId_reportDate: { userId: profile.userId, reportDate: today } },
      });
      if (existing) continue;

      const lat = Number(profile.locationLat);
      const lng = Number(profile.locationLng);

      const [weather, airQuality] = await Promise.all([fetchWeather(lat, lng), fetchAirQuality(lat, lng)]);

      const sections = matchRulesToWeather(rules, weather, airQuality);

      await prisma.skinWeatherReport.create({
        data: {
          userId: profile.userId,
          reportDate: today,
          weatherData: weather,
          reportData: { sections },
        },
      });

      if (profile.notificationsEnabled && sections.length > 0) {
        await sendPushToUser(profile.userId, {
          title: 'Pogoda dla Twojej skóry',
          body: sections[0].label,
          url: '/user/pogoda-skory',
        });
      }

      console.log(`[SkinWeather] Report generated for user ${profile.userId}`);
    } catch (err) {
      console.error(`[SkinWeather] Error processing profile ${profile.userId}:`, err);
    }
  }

  console.log('[SkinWeather] Done processing reports.');
};

export const initializeSkinWeatherScheduler = () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Calculate delay until next 4:00 UTC (= 6:00 PL)
  const now = new Date();
  const next4UTC = new Date(now);
  next4UTC.setUTCHours(4, 0, 0, 0);
  if (next4UTC <= now) next4UTC.setUTCDate(next4UTC.getUTCDate() + 1);
  const delay = next4UTC.getTime() - now.getTime();

  // On startup: run if any profile lacks a report for today
  const today = startOfDay(now);
  (async () => {
    try {
      const usersWithReport = await prisma.skinWeatherReport
        .findMany({ where: { reportDate: today }, select: { userId: true } });
      const coveredIds = usersWithReport.map((r) => r.userId);
      const missing = await prisma.skinWeatherProfile.findFirst({
        where: coveredIds.length > 0 ? { NOT: { userId: { in: coveredIds } } } : {},
      });
      if (missing) processSkinWeatherReports();
    } catch (err) {
      console.error('[SkinWeather] Startup check error:', err);
    }
  })();

  setTimeout(() => {
    processSkinWeatherReports();
    setInterval(processSkinWeatherReports, MS_PER_DAY);
  }, delay);

  console.log(`[SkinWeather] Scheduler initialized. Next run in ${Math.round(delay / 60000)} minutes.`);
};

// ── Skin Type Advice ──────────────────────────────────────────────────────────

const VALID_SKIN_TYPES = ['SUCHA', 'TLUSTA', 'MIESZANA', 'NORMALNA', 'WRAZLIWA'] as const;

export const getSkinTypeAdvice = async () => {
  return prisma.skinTypeAdvice.findMany({ orderBy: { skinType: 'asc' } });
};

export const updateSkinTypeAdvice = async (skinType: string, content: string) => {
  if (!VALID_SKIN_TYPES.includes(skinType as any)) {
    throw new AppError('Nieprawidłowy typ skóry', 400);
  }
  return prisma.skinTypeAdvice.upsert({
    where: { skinType: skinType as any },
    update: { content },
    create: { skinType: skinType as any, content },
  });
};

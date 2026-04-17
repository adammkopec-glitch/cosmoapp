import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import {
  Cloud, Sun, MapPin, Bell, BellOff,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  Settings, Pencil, X,
} from 'lucide-react';
import { skinWeatherApi } from '@/api/skin-weather.api';
import { useSkinWeatherLocation } from '@/hooks/useSkinWeatherLocation';
import { SkinTypeQuiz, SKIN_TYPE_INFO } from '@/components/skin-weather/SkinTypeQuiz';

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIN_TYPES = [
  { value: 'SUCHA',    label: 'Sucha' },
  { value: 'TLUSTA',   label: 'Tłusta' },
  { value: 'MIESZANA', label: 'Mieszana' },
  { value: 'NORMALNA', label: 'Normalna' },
  { value: 'WRAZLIWA', label: 'Wrażliwa' },
];

const SKIN_CONCERNS = [
  { value: 'NAWODNIENIE',     label: 'Nawodnienie' },
  { value: 'PRZEBARWIENIA',   label: 'Przebarwienia' },
  { value: 'TRADZIK',         label: 'Trądzik' },
  { value: 'STARZENIE',       label: 'Starzenie' },
  { value: 'WRAZLIWOSC',      label: 'Wrażliwość' },
  { value: 'PRZETLUSZCZANIE', label: 'Przetłuszczanie' },
  { value: 'ZACZERWIENIENIA', label: 'Zaczerwienienia' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: any }) {
  return (
    <div className="flex gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
      <div className="mt-0.5 shrink-0">
        <Cloud className="h-4 w-4 text-sky-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-snug">{section.label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{section.recommendation}</p>
      </div>
    </div>
  );
}

// ─── Today's Report ───────────────────────────────────────────────────────────

function TodayReport({ hasProfile }: { hasProfile: boolean }) {
  const qc = useQueryClient();
  const { data: report, isLoading, isError } = useQuery<any>({
    queryKey: ['skin-weather', 'today'],
    queryFn: skinWeatherApi.getTodayReport,
    retry: false,
    enabled: hasProfile,
  });

  const generateMutation = useMutation({
    mutationFn: skinWeatherApi.generateMyReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'today'] });
      qc.invalidateQueries({ queryKey: ['skin-weather', 'history'] });
      toast.success('Raport wygenerowany');
    },
    onError: (err) => {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? 'Błąd generowania raportu');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => skinWeatherApi.generateMyReport(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'today'] });
      qc.invalidateQueries({ queryKey: ['skin-weather', 'history'] });
      toast.success('Raport odświeżony');
    },
    onError: (err) => {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? 'Błąd odświeżania raportu');
    },
  });

  const isRefreshing = refreshMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Ładowanie raportu...</span>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/80 to-slate-800/80 p-6 text-center">
          <div className="text-5xl mb-3 leading-none">🌥️</div>
          <p className="text-sm font-semibold text-foreground mb-1">Brak raportu na dziś</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5">
            Raport generowany automatycznie o 6:00.<br />Możesz też wygenerować go teraz.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generateMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Generowanie raportu...</>
              : <><span>✨</span>Wygeneruj raport teraz</>}
          </button>
          {!generateMutation.isPending && (
            <p className="text-[11px] text-muted-foreground mt-2">Zajmuje kilka sekund</p>
          )}
        </div>
      </div>
    );
  }

  const sections: any[] = (report.reportData as any)?.sections ?? [];

  return (
    <div className="space-y-3">
      {sections.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground py-1">
            Brak reguł pasujących do dzisiejszych warunków pogodowych.
          </p>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Odśwież raport
          </button>
        </div>
      ) : (
        <>
          {sections.map((s: any, i: number) => <SectionCard key={i} section={s} />)}
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/30 hover:text-foreground transition-colors disabled:opacity-50 mt-1"
          >
            {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Odśwież
          </button>
        </>
      )}
    </div>
  );
}

// ─── Report History ───────────────────────────────────────────────────────────

function ReportHistory() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'history', page],
    queryFn: () => skinWeatherApi.getReportHistory(page, 5),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Ładowanie historii...</span>
      </div>
    );
  }

  const reports: any[] = data?.data ?? [];
  const totalPages: number = data?.totalPages ?? 1;

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Brak poprzednich raportów.</p>;
  }

  return (
    <div className="space-y-2">
      {reports.map((r: any) => {
        const sections: any[] = (r.reportData as any)?.sections ?? [];
        const isOpen = expandedId === r.id;
        return (
          <div key={r.id} className="border border-border/50 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isOpen ? null : r.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-medium">{formatDate(r.reportDate)}</span>
                <span className="text-xs text-muted-foreground">({sections.length} wskazówek)</span>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                {sections.length === 0
                  ? <p className="text-xs text-muted-foreground">Brak wskazówek.</p>
                  : sections.map((s: any, i: number) => <SectionCard key={i} section={s} />)
                }
              </div>
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40 transition-colors"
          >
            Poprzednia
          </button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40 transition-colors"
          >
            Następna
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SkinWeatherProfile = () => {
  const qc = useQueryClient();

  // ── Profile query ──
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'profile'],
    queryFn: skinWeatherApi.getProfile,
    retry: false,
  });

  // ── Skin type advice query ──
  const { data: adviceList } = useQuery<Array<{ id: string; skinType: string; content: string; updatedAt: string }>>({
    queryKey: ['skin-weather', 'advice'],
    queryFn: skinWeatherApi.getSkinTypeAdvice,
    enabled: !!profile,
  });

  // ── Auto-detect location on every visit ──
  useSkinWeatherLocation(true);

  // ── Upsert mutation (shared) ──
  const mutation = useMutation({
    mutationFn: skinWeatherApi.upsertProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather'] });
      toast.success('Profil zapisany!');
    },
    onError: (err) => {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? 'Błąd zapisu profilu');
    },
  });

  // ── "Zmień" panel state ──
  type ChangeMode = null | 'inline' | 'quiz';
  const [changeMode, setChangeMode] = useState<ChangeMode>(null);
  const [manualSkinType, setManualSkinType] = useState<string>('');

  // ── Collapsible settings state ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsConcerns, setSettingsConcerns] = useState<string[]>([]);
  const [settingsNotifications, setSettingsNotifications] = useState(false);

  // Sync settings state when profile loads
  const profileRef = { loaded: false };
  if (profile && !profileRef.loaded) {
    // We use effect-free approach: always derive from profile for initial render
  }

  // ── Derived ──
  const hasProfile = !isLoading && !!profile;
  const skinTypeInfo = profile ? SKIN_TYPE_INFO[profile.skinType as keyof typeof SKIN_TYPE_INFO] : null;
  const advice = adviceList?.find(a => a.skinType === profile?.skinType);

  // ── Handlers ──

  function handleQuizComplete(skinType: string, skinConcerns: string[]) {
    mutation.mutate({
      skinType,
      skinConcerns,
      locationLat: 0,
      locationLng: 0,
      cityName: 'Wykrywanie...',
      notificationsEnabled: false,
    });
  }

  function handleInlineQuizComplete(skinType: string, skinConcerns: string[]) {
    mutation.mutate(
      {
        skinType,
        skinConcerns: skinConcerns.length > 0 ? skinConcerns : (profile?.skinConcerns ?? []),
        locationLat: Number(profile?.locationLat) || 0,
        locationLng: Number(profile?.locationLng) || 0,
        cityName: profile?.cityName || 'Wykrywanie...',
        notificationsEnabled: profile?.notificationsEnabled ?? false,
      },
      {
        onSuccess: () => {
          setChangeMode(null);
        },
      },
    );
  }

  function handleManualSkinTypeSave() {
    if (!manualSkinType) return;
    mutation.mutate(
      {
        skinType: manualSkinType,
        skinConcerns: profile?.skinConcerns ?? [],
        locationLat: Number(profile?.locationLat) || 0,
        locationLng: Number(profile?.locationLng) || 0,
        cityName: profile?.cityName || 'Wykrywanie...',
        notificationsEnabled: profile?.notificationsEnabled ?? false,
      },
      {
        onSuccess: () => {
          setChangeMode(null);
          setManualSkinType('');
        },
      },
    );
  }

  function handleSettingsSave() {
    mutation.mutate({
      skinType: profile?.skinType ?? '',
      skinConcerns: settingsConcerns,
      locationLat: Number(profile?.locationLat) || 0,
      locationLng: Number(profile?.locationLng) || 0,
      cityName: profile?.cityName || 'Wykrywanie...',
      notificationsEnabled: settingsNotifications,
    });
  }

  function toggleSettingsConcern(val: string) {
    setSettingsConcerns(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val],
    );
  }

  function openSettings() {
    // Sync from profile when opening
    setSettingsConcerns(profile?.skinConcerns ?? []);
    setSettingsNotifications(profile?.notificationsEnabled ?? false);
    setSettingsOpen(true);
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Ładowanie profilu...</span>
        </div>
      </div>
    );
  }

  // ── First-time user: show quiz fullscreen ──
  if (!isLoading && !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-2xl">
            <Cloud className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Twoja Skóra</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Odpowiedz na kilka pytań, aby skonfigurować spersonalizowane raporty pogodowe dla Twojej skóry.
            </p>
          </div>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading text-base font-semibold mb-5">Quiz typologiczny</h2>
          <SkinTypeQuiz onComplete={handleQuizComplete} isSubmitting={mutation.isPending} />
        </section>
      </div>
    );
  }

  // ── Returning user: full layout ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-2xl">
          <Cloud className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold">Twoja Skóra</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Codzienne wskazówki pielęgnacyjne dopasowane do warunków atmosferycznych w Twojej lokalizacji.
          </p>
        </div>
      </div>

      {/* Section A: Skin type */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Twój typ skóry</h2>
          {changeMode === null ? (
            <button
              onClick={() => {
                setChangeMode('inline');
                setManualSkinType(profile?.skinType ?? '');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Zmień
            </button>
          ) : (
            <button
              onClick={() => setChangeMode(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Anuluj
            </button>
          )}
        </div>

        {/* Skin type chip */}
        {skinTypeInfo && (
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{skinTypeInfo.emoji}</span>
            <div>
              <p className="text-sm font-semibold">{skinTypeInfo.label}</p>
              <p className="text-xs text-muted-foreground">{skinTypeInfo.desc}</p>
            </div>
          </div>
        )}

        {/* Admin advice */}
        <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
          {advice?.content ? (
            <p className="text-sm text-foreground leading-relaxed">{advice.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Administrator nie dodał jeszcze porad dla tego typu skóry.
            </p>
          )}
        </div>

        {/* "Zmień" inline panel */}
        {changeMode === 'inline' && (
          <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-muted/10">
            <div className="flex gap-2">
              <button
                onClick={() => setChangeMode('quiz')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-muted/30 transition-colors"
              >
                Wykonaj quiz ponownie
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border/50" />
              lub
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Wybierz ręcznie</label>
              <div className="flex gap-2">
                <select
                  value={manualSkinType}
                  onChange={e => setManualSkinType(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                >
                  <option value="">— wybierz typ —</option>
                  {SKIN_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleManualSkinTypeSave}
                  disabled={!manualSkinType || mutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline quiz */}
        {changeMode === 'quiz' && (
          <div className="border border-border/50 rounded-xl p-4 bg-muted/10">
            <SkinTypeQuiz onComplete={handleInlineQuizComplete} isSubmitting={mutation.isPending} />
          </div>
        )}
      </section>

      {/* Section B: Today's Report */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Sun className="h-4 w-4 text-amber-500" />
          <h2 className="font-heading text-base font-semibold">Raport na dziś</h2>
        </div>
        <TodayReport hasProfile={hasProfile} />
      </section>

      {/* Section C: History */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Cloud className="h-4 w-4 text-slate-400" />
          <h2 className="font-heading text-base font-semibold">Historia raportów</h2>
        </div>
        <ReportHistory />
      </section>

      {/* Collapsible ProfileSettings */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => {
            if (!settingsOpen) openSettings();
            else setSettingsOpen(false);
          }}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Ustawienia profilu</span>
          </div>
          {settingsOpen
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {settingsOpen && (
          <div className="px-6 pb-6 pt-2 space-y-5 border-t border-border/30">
            {/* Skin Concerns */}
            <div>
              <p className="text-sm font-semibold mb-2">
                Problemy skórne{' '}
                <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {SKIN_CONCERNS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => toggleSettingsConcern(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      settingsConcerns.includes(c.value)
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
              <div className="flex items-center gap-3">
                {settingsNotifications
                  ? <Bell className="h-4 w-4" />
                  : <BellOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Powiadomienia push</p>
                  <p className="text-xs text-muted-foreground">Codzienny raport o 6:00</p>
                </div>
              </div>
              <button
                onClick={() => setSettingsNotifications(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  settingsNotifications ? 'bg-foreground' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform ${
                    settingsNotifications ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Location info (read-only) */}
            <div className="flex items-center gap-3 p-3 bg-sky-50/60 dark:bg-sky-900/10 rounded-xl border border-sky-200/60 dark:border-sky-800/40">
              <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Lokalizacja wykrywana automatycznie</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile?.cityName && profile.cityName !== 'Wykrywanie...'
                    ? `Aktualna: ${profile.cityName}`
                    : 'Zostanie pobrana z GPS przy każdym wejściu na stronę.'}
                </p>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSettingsSave}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Zapisz zmiany
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default SkinWeatherProfile;

# Skin Weather Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the normalized 0–100 slider rule system with intuitive preset-based conditions (AND logic), and add a prominent mobile-first "Generate report" CTA to the user panel and dashboard widget when no report exists for today.

**Architecture:** New `conditions String[]` column on `SkinWeatherRule` replaces 10 per-param columns; backend matching switches from distance-based scoring to simple threshold checks against raw API values; frontend admin form replaces sliders with clickable preset tiles; user-facing components show a prominent empty state with a generate button.

**Tech Stack:** Prisma + PostgreSQL (migration), Node.js/Express (service), React 19 + TanStack Query + Tailwind CSS (frontend)

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `apps/server/prisma/schema.prisma` | Modify | Remove 10 param columns, add `conditions String[]` |
| `apps/server/prisma/migrations/20260415000001_skin_weather_presets/migration.sql` | Create | Drop old columns, add conditions, delete old rules |
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | Modify | New `WeatherData` type, `checkCondition`, `matchRulesToWeather`, update `createRule`/`updateRule`/`generateReportForUser`/`processSkinWeatherReports` |
| `apps/server/src/modules/skin-weather/skin-weather.controller.ts` | Modify | Update `RuleParams` DTO type |
| `apps/web/src/api/skin-weather.api.ts` | Modify | Update `createRule`/`updateRule` types to `conditions: string[]` |
| `apps/web/src/pages/admin/SkinWeatherRules.tsx` | Modify | Rewrite `RuleForm` (preset tiles), update `RuleCard` (condition chips), remove PARAMS/slider constants |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | Modify | Replace `TodayReport` empty/error state with prominent mobile-first card + full-width button |
| `apps/web/src/components/dashboard/SkinWeatherWidget.tsx` | Modify | Replace passive "Raport o 6:00" text with generate button when no report |

---

## Task 1: Database Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/migrations/20260415000001_skin_weather_presets/migration.sql`

- [ ] **Step 1: Update schema.prisma**

In `apps/server/prisma/schema.prisma`, find the `SkinWeatherRule` model and replace it entirely:

```prisma
model SkinWeatherRule {
  id             String   @id @default(cuid())
  label          String
  recommendation String   @db.Text
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)
  conditions     String[] @default([])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

The old model had these columns to remove: `uvEnabled`, `uvTarget`, `aqiEnabled`, `aqiTarget`, `humidityEnabled`, `humidityTarget`, `temperatureEnabled`, `temperatureTarget`, `precipEnabled`, `precipTarget`, `matchThreshold`.

- [ ] **Step 2: Create migration directory and SQL file**

Create directory `apps/server/prisma/migrations/20260415000001_skin_weather_presets/` and write `migration.sql`:

```sql
-- Delete all existing rules (incompatible with new system)
DELETE FROM "SkinWeatherRule";

-- Drop old parameter columns
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "uvEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "uvTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "aqiEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "aqiTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "humidityEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "humidityTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "temperatureEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "temperatureTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "precipEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "precipTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "matchThreshold";

-- Add new conditions array column
ALTER TABLE "SkinWeatherRule" ADD COLUMN "conditions" TEXT[] NOT NULL DEFAULT '{}';
```

- [ ] **Step 3: Run migration**

```bash
cd apps/server
pnpm prisma:migrate
```

Expected: Migration applied successfully. If prompted for a name, use `skin_weather_presets`.

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm prisma:generate
```

Expected: `Generated Prisma Client` message, no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/20260415000001_skin_weather_presets/
git commit -m "feat(skin-weather): migrate rules to preset conditions array"
```

---

## Task 2: Backend Service — New Matching Logic

**Files:**
- Modify: `apps/server/src/modules/skin-weather/skin-weather.service.ts`

- [ ] **Step 1: Replace `RuleParams` type and add `WeatherData` type**

At the top of the service file (after imports), add the `WeatherData` interface and replace the `RuleParams` type:

```ts
interface WeatherData {
  temperature: number; // °C raw
  uv: number;          // UV index 0–11+
  precip: number;      // precipitation probability % 0–100
  humidity: number;    // relative humidity % 0–100
  aqi: number;         // EU AQI 0–300
}

type RuleParams = {
  label: string;
  recommendation: string;
  sortOrder?: number;
  isActive?: boolean;
  conditions?: string[];
};
```

- [ ] **Step 2: Replace `createRule` function**

Replace the entire `createRule` function:

```ts
export const createRule = async (data: RuleParams) => {
  return prisma.skinWeatherRule.create({
    data: {
      label: data.label,
      recommendation: data.recommendation,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      conditions: data.conditions ?? [],
    },
  });
};
```

- [ ] **Step 3: Replace `updateRule` function**

Replace the entire `updateRule` function:

```ts
export const updateRule = async (id: string, data: Partial<RuleParams>) => {
  const rule = await prisma.skinWeatherRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('Reguła nie znaleziona', 404);
  return prisma.skinWeatherRule.update({ where: { id }, data });
};
```

- [ ] **Step 4: Replace weather matching helpers**

Remove the `NORMALIZE` object, `calcAvgDistance` function, and old `matchRulesToWeather` function entirely. Replace with:

```ts
function buildWeatherData(weather: any, airQuality: any): WeatherData {
  return {
    temperature: weather?.current?.temperature_2m ?? 20,
    uv:          weather?.current?.uv_index ?? 0,
    precip:      weather?.current?.precipitation_probability ?? 0,
    humidity:    weather?.current?.relative_humidity_2m ?? 50,
    aqi:         airQuality?.current?.european_aqi ?? 0,
  };
}

function checkCondition(condition: string, w: WeatherData): boolean {
  switch (condition) {
    case 'HOT':     return w.temperature > 28;
    case 'COLD':    return w.temperature < 5;
    case 'HIGH_UV': return w.uv >= 6;
    case 'RAINY':   return w.precip >= 60;
    case 'SMOG':    return w.aqi >= 150;
    case 'HUMID':   return w.humidity >= 75;
    case 'DRY':     return w.humidity <= 30;
    default:        return false;
  }
}

const matchRulesToWeather = (rules: any[], weather: any, airQuality: any) => {
  const w = buildWeatherData(weather, airQuality);
  return rules
    .filter(r => r.isActive && r.conditions.length > 0)
    .filter(r => (r.conditions as string[]).every(c => checkCondition(c, w)))
    .map(r => ({ label: r.label, recommendation: r.recommendation }));
};
```

Note: `matchRulesToWeather` keeps the same 3-argument signature (`rules, weather, airQuality`) so `generateReportForUser` and `processSkinWeatherReports` call sites don't need to change.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/server
pnpm build
```

Expected: No errors. If there are TS errors on old param references, they will be in the controller — fix in Task 3.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/skin-weather/skin-weather.service.ts
git commit -m "feat(skin-weather): replace distance matching with preset conditions"
```

---

## Task 3: Backend Controller DTO Update

**Files:**
- Modify: `apps/server/src/modules/skin-weather/skin-weather.controller.ts`

- [ ] **Step 1: Read the controller**

Open `apps/server/src/modules/skin-weather/skin-weather.controller.ts` and find the `createRule` and `updateRule` handler bodies. They currently destructure the old param fields (`uvEnabled`, `uvTarget`, etc.) from `req.body`.

- [ ] **Step 2: Update createRule handler**

Replace the destructuring in `createRule` handler to use the new shape:

```ts
// In createRule handler:
const { label, recommendation, conditions, isActive, sortOrder } = req.body;
const rule = await skinWeatherService.createRule({ label, recommendation, conditions, isActive, sortOrder });
res.status(201).json(rule);
```

- [ ] **Step 3: Update updateRule handler**

Replace the destructuring in `updateRule` handler:

```ts
// In updateRule handler:
const { id } = req.params;
const { label, recommendation, conditions, isActive, sortOrder } = req.body;
const rule = await skinWeatherService.updateRule(id, { label, recommendation, conditions, isActive, sortOrder });
res.json(rule);
```

- [ ] **Step 4: Build to verify**

```bash
cd apps/server
pnpm build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/skin-weather/skin-weather.controller.ts
git commit -m "feat(skin-weather): update controller DTOs for conditions array"
```

---

## Task 4: Frontend API Types

**Files:**
- Modify: `apps/web/src/api/skin-weather.api.ts`

- [ ] **Step 1: Update createRule type**

Replace the `createRule` function signature:

```ts
createRule: async (data: {
  label: string;
  recommendation: string;
  sortOrder?: number;
  isActive?: boolean;
  conditions?: string[];
}) => {
  const res = await api.post('/skin-weather/rules', data);
  return res.data;
},
```

- [ ] **Step 2: Update updateRule type**

Replace the `updateRule` function signature:

```ts
updateRule: async (
  id: string,
  data: {
    label?: string;
    recommendation?: string;
    sortOrder?: number;
    isActive?: boolean;
    conditions?: string[];
  },
) => {
  const res = await api.put(`/skin-weather/rules/${id}`, data);
  return res.data;
},
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/skin-weather.api.ts
git commit -m "feat(skin-weather): update API client types for conditions array"
```

---

## Task 5: Admin UI — Preset Tiles Form

**Files:**
- Modify: `apps/web/src/pages/admin/SkinWeatherRules.tsx`

This is a full rewrite of the `RuleForm` component and update of `RuleCard`. Keep: page header, mutations, `SkinWeatherRules` main component structure, `generateAllMutation`.

- [ ] **Step 1: Replace constants at top of file**

Remove `PARAMS`, `describeValue`, `PercentBar`. Add the preset config:

```ts
type ConditionKey = 'HOT' | 'COLD' | 'HIGH_UV' | 'RAINY' | 'SMOG' | 'HUMID' | 'DRY';

const CONDITION_PRESETS: {
  key: ConditionKey;
  label: string;
  icon: string;
  threshold: string;
  color: string;
  selectedBorder: string;
  selectedBg: string;
  chipColor: string;
}[] = [
  { key: 'HOT',     label: 'Gorąco',     icon: '🌡️', threshold: '>28°C',    color: 'text-orange-500', selectedBorder: 'border-orange-400', selectedBg: 'bg-orange-400/10', chipColor: 'bg-orange-400/15 text-orange-400 border-orange-400/30' },
  { key: 'COLD',    label: 'Zimno',      icon: '❄️', threshold: '<5°C',     color: 'text-cyan-400',   selectedBorder: 'border-cyan-400',   selectedBg: 'bg-cyan-400/10',   chipColor: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30' },
  { key: 'HIGH_UV', label: 'Wysokie UV', icon: '☀️', threshold: 'UV ≥ 6',  color: 'text-amber-400',  selectedBorder: 'border-amber-400',  selectedBg: 'bg-amber-400/10',  chipColor: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
  { key: 'RAINY',   label: 'Deszcz',     icon: '🌧️', threshold: 'opady ≥60%', color: 'text-blue-400', selectedBorder: 'border-blue-400',  selectedBg: 'bg-blue-400/10',   chipColor: 'bg-blue-400/15 text-blue-400 border-blue-400/30' },
  { key: 'SMOG',    label: 'Smog',       icon: '🌫️', threshold: 'AQI ≥150', color: 'text-slate-400',  selectedBorder: 'border-slate-400',  selectedBg: 'bg-slate-400/10',  chipColor: 'bg-slate-400/15 text-slate-400 border-slate-400/30' },
  { key: 'HUMID',   label: 'Wilgotno',   icon: '💧', threshold: 'wilg. ≥75%', color: 'text-teal-400', selectedBorder: 'border-teal-400',  selectedBg: 'bg-teal-400/10',   chipColor: 'bg-teal-400/15 text-teal-400 border-teal-400/30' },
  { key: 'DRY',     label: 'Sucho',      icon: '🏜️', threshold: 'wilg. ≤30%', color: 'text-yellow-500', selectedBorder: 'border-yellow-500', selectedBg: 'bg-yellow-500/10', chipColor: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' },
];
```

- [ ] **Step 2: Replace FormState type and EMPTY_FORM**

```ts
type FormState = {
  label: string;
  recommendation: string;
  isActive: boolean;
  conditions: ConditionKey[];
};

const EMPTY_FORM: FormState = {
  label: '',
  recommendation: '',
  isActive: true,
  conditions: [],
};
```

- [ ] **Step 3: Rewrite RuleForm component**

Replace entire `RuleForm` function:

```tsx
function RuleForm({
  initial,
  onClose,
  onSave,
  isPending,
}: {
  initial: FormState;
  onClose: () => void;
  onSave: (data: FormState) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const toggleCondition = (key: ConditionKey) => {
    setForm(f => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter(c => c !== key)
        : [...f.conditions, key],
    }));
  };

  const andLabel = form.conditions.length === 0
    ? null
    : form.conditions
        .map(k => CONDITION_PRESETS.find(p => p.key === k)?.label ?? k)
        .join(' ORAZ ');

  const valid = form.label.trim() && form.recommendation.trim() && form.conditions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-base">
            {initial.label ? 'Edytuj regułę' : 'Nowa reguła'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nazwa reguły</label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="np. Upał i intensywne słońce"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>

          {/* Conditions grid */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Warunki pogodowe{' '}
              <span className="font-normal">(wszystkie muszą być spełnione)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONDITION_PRESETS.map(preset => {
                const selected = form.conditions.includes(preset.key);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => toggleCondition(preset.key)}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                      selected
                        ? `${preset.selectedBorder} ${preset.selectedBg}`
                        : 'border-border/40 hover:border-border bg-transparent'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-bold">✓</span>
                    )}
                    <span className="text-xl leading-none">{preset.icon}</span>
                    <span className={`text-xs font-semibold ${selected ? preset.color : 'text-muted-foreground'}`}>{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.threshold}</span>
                  </button>
                );
              })}
            </div>
            {andLabel && (
              <div className="mt-3 px-3 py-2 bg-foreground/5 border border-border/40 rounded-lg">
                <p className="text-xs text-foreground">
                  <span className="text-muted-foreground">Aktywuje się gdy: </span>
                  <span className="font-semibold">{andLabel}</span>
                </p>
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rekomendacja dla klienta</label>
            <textarea
              value={form.recommendation}
              onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
              rows={3}
              placeholder="Szczegółowy tekst porady..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-foreground' : 'bg-border'}`}
              style={{ width: '2rem', height: '1rem' }}
            >
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-muted-foreground">Reguła aktywna</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/40 transition-colors">
            Anuluj
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite RuleCard component**

Replace entire `RuleCard` function:

```tsx
function RuleCard({ rule, onEdit, onDelete }: { rule: any; onEdit: () => void; onDelete: () => void }) {
  const conditions: string[] = rule.conditions ?? [];
  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all ${
      rule.isActive ? 'border-l-foreground/40 border-border/50 bg-card' : 'border-l-border border-border/30 bg-muted/20 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-semibold">{rule.label}</span>
            {!rule.isActive && (
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">nieaktywna</span>
            )}
          </div>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {conditions.map((key: string) => {
                const preset = CONDITION_PRESETS.find(p => p.key === key);
                if (!preset) return null;
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${preset.chipColor}`}>
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                    <span className="opacity-70">{preset.threshold}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic mb-2">Brak warunków</p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rule.recommendation}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update formInitial mapping in SkinWeatherRules main component**

Find the `formInitial` variable and replace:

```ts
const formInitial: FormState = editingRule
  ? {
      label: editingRule.label,
      recommendation: editingRule.recommendation,
      isActive: editingRule.isActive,
      conditions: editingRule.conditions ?? [],
    }
  : EMPTY_FORM;
```

- [ ] **Step 6: Remove unused imports**

Remove from imports: `Sun`, `Droplets`, `Wind`, `Thermometer`, `Cloud` if no longer used (keep `Cloud` if used in page header/empty state). Keep: `Plus`, `Pencil`, `Trash2`, `X`, `Loader2`, `RefreshCw`, `Cloud`.

- [ ] **Step 7: Verify in browser**

Start dev server: `pnpm dev` from repo root. Navigate to `/admin/pogoda-skory` (or find the admin rules route in router). Verify:
- Rule list shows condition chips with icons and thresholds
- "Dodaj regułę" opens modal with preset tiles
- Clicking a tile toggles selection with checkmark
- AND indicator shows below tiles when ≥1 selected
- Save button disabled until label + recommendation + ≥1 condition
- Edit opens form pre-populated with existing conditions
- Delete works

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/admin/SkinWeatherRules.tsx
git commit -m "feat(skin-weather): rewrite admin rule form with preset condition tiles"
```

---

## Task 6: User Panel — Prominent Empty State

**Files:**
- Modify: `apps/web/src/pages/user/SkinWeatherProfile.tsx`

The `TodayReport` component currently shows a plain `AlertCircle` card + small border button when `isError || !report`. Replace with a prominent gradient card and full-width button.

- [ ] **Step 1: Replace TodayReport empty/error state**

In `TodayReport` component, replace the `if (isError || !report)` block:

```tsx
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
```

- [ ] **Step 2: Remove matchScore display from SectionCard**

The new matching system doesn't produce `matchScore`. In `SectionCard`, remove the score badge:

```tsx
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
```

- [ ] **Step 3: Verify on mobile viewport**

In browser DevTools, set viewport to 390×844 (iPhone 14). Navigate to `/user/pogoda-skory`. Verify:
- Empty state card is visible with gradient background
- Button is full-width and at least 48px tall (easy to tap)
- After clicking, loading spinner shows
- After report generates, sections appear

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/user/SkinWeatherProfile.tsx
git commit -m "feat(skin-weather): add prominent mobile-first generate report CTA"
```

---

## Task 7: Dashboard Widget — Generate Button

**Files:**
- Modify: `apps/web/src/components/dashboard/SkinWeatherWidget.tsx`

- [ ] **Step 1: Add generate mutation to widget**

Add TanStack Query imports and mutation at top of `SkinWeatherWidget` component:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
```

Inside `SkinWeatherWidget` component body, add:

```tsx
const qc = useQueryClient();

const generateMutation = useMutation({
  mutationFn: skinWeatherApi.generateMyReport,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['skin-weather', 'today'] });
    toast.success('Raport wygenerowany');
  },
  onError: (err) => {
    const msg = isAxiosError(err) ? (err.response?.data as any)?.message : null;
    toast.error(msg ?? 'Błąd generowania raportu');
  },
});
```

- [ ] **Step 2: Replace no-report state in widget**

Find the `!report || sections.length === 0` condition in the widget's return JSX and replace the inner content:

```tsx
) : !report ? (
  <div className="rounded-xl bg-background/50 border border-border/40 p-3">
    <p className="text-xs text-muted-foreground mb-3">Raport nie został jeszcze wygenerowany</p>
    <button
      onClick={() => generateMutation.mutate()}
      disabled={generateMutation.isPending}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {generateMutation.isPending
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generowanie...</>
        : <><span>✨</span>Wygeneruj teraz</>}
    </button>
  </div>
) : sections.length === 0 ? (
  <div className="flex items-start gap-2.5 py-1">
    <Cloud className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
    <p className="text-xs text-muted-foreground leading-relaxed">
      Brak wskazówek pasujących do dzisiejszych warunków.
    </p>
  </div>
```

Note: Split the old `!report || sections.length === 0` into two separate branches — `!report` shows the generate button, `sections.length === 0` shows "no matching rules" message.

- [ ] **Step 3: Verify widget on dashboard**

Navigate to `/user/dashboard`. Verify:
- When no report: generate button appears inside widget
- Button is full-width within widget
- Clicking generates report and widget updates
- When report exists: sections show as before

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/SkinWeatherWidget.tsx
git commit -m "feat(skin-weather): add generate report button to dashboard widget"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Full build check**

```bash
cd apps/server && pnpm build
```

Expected: No TypeScript errors.

- [ ] **Step 2: Start dev and do end-to-end smoke test**

```bash
# From cosmo-app root:
pnpm dev
```

Run through this checklist:

**Admin panel:**
- [ ] Navigate to admin skin weather rules page
- [ ] Create a new rule with 2 preset conditions (e.g. HOT + HIGH_UV), label, recommendation → saves successfully
- [ ] Rule card shows condition chips with icons and threshold labels
- [ ] Edit rule → form opens with conditions pre-selected
- [ ] Toggle rule active/inactive → card reflects change
- [ ] Delete rule → removed from list

**User panel:**
- [ ] Navigate to `/user/pogoda-skory` with no report for today
- [ ] Gradient empty state card is visible
- [ ] Click "Wygeneruj raport teraz" → loading spinner → report appears (if rules exist and weather matches)
- [ ] Mobile viewport (390px): button is full-width and tappable

**Dashboard widget:**
- [ ] Navigate to `/user/dashboard`
- [ ] Widget shows generate button when no report
- [ ] Clicking generates report → widget refreshes

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(skin-weather): redesign complete — preset rules + generate CTA"
```

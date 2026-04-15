# Skin Weather Redesign — Design Spec
**Date:** 2026-04-15
**Branch:** feat/modern-glamour-refresh
**Status:** Approved

---

## Overview

Two interconnected improvements to the Skin Weather feature:

1. **Admin panel rule logic redesign** — replace the current normalized 0–100 slider system with intuitive preset-based conditions (AND logic, multiple conditions per rule)
2. **User panel & dashboard widget** — add prominent "Generate report" CTA when no report exists for today (mobile-first)

---

## Section 1 — Database Schema

### Existing rules migration strategy

All existing `SkinWeatherRule` rows will have `conditions = []` after the migration. The migration SQL must **delete all existing rules** (`DELETE FROM "SkinWeatherRule";`) so the admin starts with a clean slate. This is intentional — the old slider-based rules are semantically incompatible with the new preset system and cannot be meaningfully converted. The admin will recreate rules using the new UI after deploy.

### Migration: `SkinWeatherRule` simplification

Remove 10 per-parameter columns and replace with a single `conditions` array:

**Columns to DROP:**
- `uvEnabled`, `uvTarget`
- `aqiEnabled`, `aqiTarget`
- `humidityEnabled`, `humidityTarget`
- `temperatureEnabled`, `temperatureTarget`
- `precipEnabled`, `precipTarget`
- `matchThreshold`

**Column to ADD:**
```prisma
conditions String[] @default([])
```

**Final model:**
```prisma
model SkinWeatherRule {
  id             String   @id @default(cuid())
  label          String
  recommendation String   @db.Text
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)
  conditions     String[] @default([])  // e.g. ["HOT", "HIGH_UV"]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### Preset Condition Keys & Thresholds

Hardcoded in the service layer (not configurable via DB):

| Key | Label | Icon | Condition | Raw unit |
|-----|-------|------|-----------|----------|
| `HOT` | Gorąco | 🌡️ | temperature > 28 | °C |
| `COLD` | Zimno | ❄️ | temperature < 5 | °C |
| `HIGH_UV` | Wysokie UV | ☀️ | uv >= 6 | UV index |
| `RAINY` | Deszcz | 🌧️ | precip >= 60 | % probability |
| `SMOG` | Smog | 🌫️ | aqi >= 150 | EU AQI |
| `HUMID` | Wilgotno | 💧 | humidity >= 75 | % |
| `DRY` | Sucho | 🏜️ | humidity <= 30 | % |

---

## Section 2 — Backend Service

### WeatherData type

Before calling `checkCondition`, the two separate Open-Meteo API responses (weather + air quality) must be merged into a single `WeatherData` object using **raw API values** (not the old normalized 0–100 values):

```ts
interface WeatherData {
  temperature: number;  // °C  (from weather API)
  uv: number;           // UV index 0–11+  (from weather API)
  precip: number;       // precipitation probability % 0–100  (from weather API)
  humidity: number;     // relative humidity % 0–100  (from weather API)
  aqi: number;          // EU AQI 0–300  (from air quality API)
}
```

The existing `fetchWeather()` and `fetchAirQuality()` calls stay unchanged — just merge their results into this shape before passing to `matchRulesToWeather`.

### New matching algorithm

Replace distance-based matching with simple condition checking against raw values:

```ts
function checkCondition(condition: string, weather: WeatherData): boolean {
  switch (condition) {
    case 'HOT':      return weather.temperature > 28;
    case 'COLD':     return weather.temperature < 5;
    case 'HIGH_UV':  return weather.uv >= 6;
    case 'RAINY':    return weather.precip >= 60;
    case 'SMOG':     return weather.aqi >= 150;
    case 'HUMID':    return weather.humidity >= 75;
    case 'DRY':      return weather.humidity <= 30;
    default:         return false;
  }
}

function matchRulesToWeather(rules: SkinWeatherRule[], weather: WeatherData) {
  return rules
    .filter(r => r.isActive && r.conditions.length > 0)
    .filter(r => r.conditions.every(c => checkCondition(c, weather)))
    .map(r => ({ label: r.label, recommendation: r.recommendation }));
}
```

**Logic:** A rule matches if and only if ALL conditions in its `conditions[]` array are met simultaneously (AND logic).

### API changes

`createRule` and `updateRule` accept `{ label, recommendation, conditions: string[], isActive, sortOrder }`.

`matchScore` removed from report output — no longer meaningful with preset matching.

**No changes to:** scheduler, push notifications, profile endpoints, report history.

---

## Section 3 — Admin UI (`SkinWeatherRules.tsx`)

### Rule form modal

Replace slider-based `RuleForm` with:

- **Label field** — text input
- **Conditions selector** — 7 preset tiles in a grid (4-column on desktop, 2-column on mobile). Each tile shows: icon, Polish label, threshold value (e.g. `>28°C`). Click toggles selection (highlighted border + checkmark badge when selected). Multi-select enabled.
- **AND indicator** — below the grid, dynamic text: `"Reguła aktywuje się gdy: [X] ORAZ [Y]"`. Only shown when ≥1 condition selected.
- **Recommendation textarea** — multiline text input
- **Active toggle** — boolean switch
- **Save button** — disabled until: label filled, recommendation filled, ≥1 condition selected

### Rule card (list view)

Each rule card shows:
- Rule label (bold)
- Condition chips — colored per preset (HOT=purple, HIGH_UV=amber, RAINY=blue, SMOG=slate, COLD=cyan, HUMID=blue, DRY=orange), each chip shows icon + label + threshold
- Active/inactive status badge
- Edit and delete icon buttons
- Recommendation text (truncated, 2 lines)
- Left border: accent color when active, gray when inactive

### Page header

Keep existing "Generuj dziś" button (triggers `generateAllReports`).

---

## Section 4 — User Panel (`SkinWeatherProfile.tsx`)

### Empty state for today's report

When `todayReport` is `null` AND not loading (profile exists):

Replace current error-only generate button with a **prominent empty state card**:

```
┌─────────────────────────────────┐
│           🌥️ (48px)             │
│   Brak raportu na dziś          │
│   Raport generowany o 6:00.     │
│   Możesz też wygenerować go     │
│   teraz.                        │
│                                 │
│  [✨ Wygeneruj raport teraz]    │  ← full-width, gradient button
│     Zajmuje kilka sekund        │
└─────────────────────────────────┘
```

**Mobile-first requirements:**
- Full-width button (`width: 100%`) — easy to tap
- Minimum touch target height: 48px
- Card uses `border-radius: 16px`, gradient background (`#1e1b4b` → `#1e293b`)
- History section visible below the empty state card (no need to scroll past a wall of nothing)

**Loading state** (after clicking generate):
- Button replaced by spinner + "Generowanie raportu..." text
- `generateMyReport` mutation; on success → invalidate `todayReport` query
- On error → toast notification with error message; button re-enabled

---

## Section 5 — Dashboard Widget (`SkinWeatherWidget.tsx`)

### No-report state (profile exists, no today's report)

Replace current "Raport pojawi się o 6:00. Wróć jutro..." message with:

```
┌──────────────────────────────┐
│ 🌤️  Pogoda dla skóry         │
│     Kraków · dziś            │
│                              │
│  ┌────────────────────────┐  │
│  │ Raport nie został      │  │
│  │ jeszcze wygenerowany   │  │
│  │ [✨ Wygeneruj teraz]   │  │  ← full-width button
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Same mutation** as profile page (`generateMyReport`). On success → invalidate both `todayReport` and widget queries.

**No-profile state** (user hasn't set up profile): unchanged — keep existing CTA linking to `/user/pogoda-skory`.

---

## Files to Change

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Remove 10 param columns, add `conditions String[]` |
| `apps/server/prisma/migrations/new` | Migration SQL |
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | New `WeatherData` type, new `checkCondition()`, new `matchRulesToWeather(rules, weather)` (2-arg), update `generateReportForUser` and `processSkinWeatherReports` to merge weather+airQuality into `WeatherData` before calling matcher, update create/update |
| `apps/server/src/modules/skin-weather/skin-weather.controller.ts` | Update DTO types |
| `apps/web/src/pages/admin/SkinWeatherRules.tsx` | Full rewrite of `RuleForm`, update `RuleCard` |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | New empty state component for today's report section |
| `apps/web/src/components/dashboard/SkinWeatherWidget.tsx` | New no-report state with generate button |
| `apps/web/src/api/skin-weather.api.ts` | Update `createRule`/`updateRule` types (conditions array) |

---

## Out of Scope

- Configurable thresholds (presets are hardcoded by design)
- OR logic between conditions (only AND supported)
- Historical report regeneration (only today's missing report)
- Changes to scheduler, push notifications, or profile form

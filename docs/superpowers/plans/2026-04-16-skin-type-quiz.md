# Skin Type Quiz & Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-step skin type quiz for first-time users and per-skin-type admin advice to the "Twoja Skóra" tab.

**Architecture:** New `SkinTypeAdvice` Prisma model (one record per skin type) stores admin-editable content. A `SkinTypeQuiz` React wizard component uses 8 questions with a scoring algorithm to determine the user's skin type. The existing `SkinWeatherProfile` page is rebuilt to show the quiz for new users and a restructured layout (skin type advice + weather report + history) for returning users. Admin gets a new tab in the existing `SkinWeatherRules` page.

**Tech Stack:** TypeScript, Prisma/PostgreSQL, Express 5, React 19, TanStack Query, Tailwind CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/server/prisma/schema.prisma` | Modify | Add `SkinTypeAdvice` model |
| `apps/server/prisma/seed.ts` | Modify | Upsert 5 empty `SkinTypeAdvice` records |
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | Modify | Add `getSkinTypeAdvice`, `updateSkinTypeAdvice` |
| `apps/server/src/modules/skin-weather/skin-weather.service.test.ts` | Create | Test new service functions |
| `apps/server/src/modules/skin-weather/skin-weather.controller.ts` | Modify | Add `getSkinTypeAdvice`, `updateSkinTypeAdvice` handlers |
| `apps/server/src/modules/skin-weather/skin-weather.router.ts` | Modify | Register 2 new routes |
| `apps/web/src/api/skin-weather.api.ts` | Modify | Add `getSkinTypeAdvice`, `updateSkinTypeAdvice` |
| `apps/web/src/components/skin-weather/SkinTypeQuiz.tsx` | Create | 8-question wizard + scoring logic |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | Modify | New layout: quiz for new users, restructured for returning |
| `apps/web/src/pages/admin/SkinWeatherRules.tsx` | Modify | Add "Porady dla typów skóry" tab |

---

## Task 1: Database — SkinTypeAdvice model

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Modify: `apps/server/prisma/seed.ts`

- [ ] **Step 1: Add model to schema**

Open `apps/server/prisma/schema.prisma`. After the `SkinWeatherRule` model (around line 882), add:

```prisma
model SkinTypeAdvice {
  id        String   @id @default(cuid())
  skinType  SkinType @unique
  content   String   @db.Text
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Run migration** (server must be stopped first)

```bash
cd apps/server
npx prisma migrate dev --name add_skin_type_advice
```

Expected output: `The following migration(s) have been created and applied from new schema changes: migrations/..._add_skin_type_advice`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected output: `Generated Prisma Client ...`

- [ ] **Step 4: Add seed entries**

In `apps/server/prisma/seed.ts`, before the closing `main()` call, add:

```typescript
// Seed SkinTypeAdvice (5 records, one per skin type)
const skinTypes: Array<'SUCHA' | 'TLUSTA' | 'MIESZANA' | 'NORMALNA' | 'WRAZLIWA'> = [
  'SUCHA', 'TLUSTA', 'MIESZANA', 'NORMALNA', 'WRAZLIWA',
];
for (const skinType of skinTypes) {
  await prisma.skinTypeAdvice.upsert({
    where: { skinType },
    update: {},
    create: { skinType, content: '' },
  });
}
console.log('Seeded 5 SkinTypeAdvice records');
```

- [ ] **Step 5: Run seed**

```bash
cd apps/server
npx prisma db seed
```

Expected: `Seeded 5 SkinTypeAdvice records`

- [ ] **Step 6: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/seed.ts apps/server/prisma/migrations/
git commit -m "feat: add SkinTypeAdvice model and seed"
```

---

## Task 2: Backend service

**Files:**
- Modify: `apps/server/src/modules/skin-weather/skin-weather.service.ts`
- Create: `apps/server/src/modules/skin-weather/skin-weather.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/modules/skin-weather/skin-weather.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing service
vi.mock('../../config/prisma', () => ({
  prisma: {
    skinTypeAdvice: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { getSkinTypeAdvice, updateSkinTypeAdvice } from './skin-weather.service';

describe('getSkinTypeAdvice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all advice records ordered by skinType', async () => {
    const fakeRecords = [
      { id: '1', skinType: 'SUCHA', content: 'porada', updatedAt: new Date() },
    ];
    vi.mocked(prisma.skinTypeAdvice.findMany).mockResolvedValue(fakeRecords as any);

    const result = await getSkinTypeAdvice();
    expect(result).toEqual(fakeRecords);
    expect(prisma.skinTypeAdvice.findMany).toHaveBeenCalledOnce();
  });
});

describe('updateSkinTypeAdvice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 400 for invalid skinType', async () => {
    await expect(updateSkinTypeAdvice('INVALID', 'treść')).rejects.toThrow('Nieprawidłowy typ skóry');
  });

  it('upserts record for valid skinType', async () => {
    const fakeRecord = { id: '1', skinType: 'SUCHA', content: 'treść', updatedAt: new Date() };
    vi.mocked(prisma.skinTypeAdvice.upsert).mockResolvedValue(fakeRecord as any);

    const result = await updateSkinTypeAdvice('SUCHA', 'treść');
    expect(result).toEqual(fakeRecord);
    expect(prisma.skinTypeAdvice.upsert).toHaveBeenCalledWith({
      where: { skinType: 'SUCHA' },
      update: { content: 'treść' },
      create: { skinType: 'SUCHA', content: 'treść' },
    });
  });

  it('allows empty content (admin can clear advice)', async () => {
    const fakeRecord = { id: '1', skinType: 'TLUSTA', content: '', updatedAt: new Date() };
    vi.mocked(prisma.skinTypeAdvice.upsert).mockResolvedValue(fakeRecord as any);

    await expect(updateSkinTypeAdvice('TLUSTA', '')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/server
pnpm vitest run src/modules/skin-weather/skin-weather.service.test.ts
```

Expected: FAIL — `getSkinTypeAdvice is not a function` (function not yet exported)

- [ ] **Step 3: Add service functions**

In `apps/server/src/modules/skin-weather/skin-weather.service.ts`, after the `deleteRule` function (around line 171), add:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/server
pnpm vitest run src/modules/skin-weather/skin-weather.service.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/skin-weather/skin-weather.service.ts \
        apps/server/src/modules/skin-weather/skin-weather.service.test.ts
git commit -m "feat: add getSkinTypeAdvice and updateSkinTypeAdvice service functions"
```

---

## Task 3: Backend controller + router

**Files:**
- Modify: `apps/server/src/modules/skin-weather/skin-weather.controller.ts`
- Modify: `apps/server/src/modules/skin-weather/skin-weather.router.ts`

- [ ] **Step 1: Add controller handlers**

In `apps/server/src/modules/skin-weather/skin-weather.controller.ts`, after the `deleteRule` handler (end of file), add:

```typescript
export const getSkinTypeAdvice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const advice = await service.getSkinTypeAdvice();
    res.json(advice);
  } catch (err) {
    next(err);
  }
};

export const updateSkinTypeAdvice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skinType } = req.params;
    const { content } = req.body;
    const advice = await service.updateSkinTypeAdvice(skinType, content ?? '');
    res.json(advice);
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Register routes in router**

In `apps/server/src/modules/skin-weather/skin-weather.router.ts`, add after the existing admin routes:

```typescript
// Skin type advice
router.get('/skin-type-advice', authenticate, controller.getSkinTypeAdvice);
router.put('/skin-type-advice/:skinType', authenticate, requireAdmin, controller.updateSkinTypeAdvice);
```

- [ ] **Step 3: Manual smoke test** (start server and test with curl or browser)

Start server: `cd apps/server && pnpm dev`

```bash
# Should return array (empty content initially after seed)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/skin-weather/skin-type-advice
```

Expected: `[{"id":"...","skinType":"MIESZANA","content":"","updatedAt":"..."},...]` (5 records)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/skin-weather/skin-weather.controller.ts \
        apps/server/src/modules/skin-weather/skin-weather.router.ts
git commit -m "feat: add skin-type-advice endpoints to controller and router"
```

---

## Task 4: Frontend API

**Files:**
- Modify: `apps/web/src/api/skin-weather.api.ts`

- [ ] **Step 1: Add two API functions**

In `apps/web/src/api/skin-weather.api.ts`, add inside the `skinWeatherApi` object after `generateAllReports`:

```typescript
getSkinTypeAdvice: async (): Promise<Array<{ id: string; skinType: string; content: string; updatedAt: string }>> => {
  const res = await api.get('/skin-weather/skin-type-advice');
  return res.data;
},

updateSkinTypeAdvice: async (skinType: string, content: string) => {
  const res = await api.put(`/skin-weather/skin-type-advice/${skinType}`, { content });
  return res.data;
},
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/skin-weather.api.ts
git commit -m "feat: add getSkinTypeAdvice and updateSkinTypeAdvice to API client"
```

---

## Task 5: SkinTypeQuiz component

**Files:**
- Create: `apps/web/src/components/skin-weather/SkinTypeQuiz.tsx`

This is the largest task. The component is a self-contained wizard that:
1. Steps through 8 questions (progress bar, back/next)
2. Computes skin type via scoring
3. Shows result with manual override option
4. Handles exact tie (two types with equal max score)
5. Collects skin concerns
6. Calls `onComplete(skinType, skinConcerns)` when done

- [ ] **Step 1: Create the component file**

Create `apps/web/src/components/skin-weather/SkinTypeQuiz.tsx` with this content:

```tsx
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SkinTypeKey = 'SUCHA' | 'TLUSTA' | 'MIESZANA' | 'NORMALNA' | 'WRAZLIWA';
type Weights = Partial<Record<SkinTypeKey, number>>;

interface Answer {
  label: string;
  weights: Weights;
}

interface Question {
  text: string;
  answers: Answer[];
}

// ─── Quiz data ────────────────────────────────────────────────────────────────

export const QUIZ_QUESTIONS: Question[] = [
  {
    text: 'Jak czuje się Twoja skóra 2–3 godziny po myciu?',
    answers: [
      { label: 'Napięta, ciągnie, szorstka',          weights: { SUCHA: 3 } },
      { label: 'Lśni, czuć wyraźne przetłuszczenie',  weights: { TLUSTA: 3 } },
      { label: 'Lśni tylko nos, czoło lub broda',     weights: { MIESZANA: 3 } },
      { label: 'Komfortowo, bez żadnych odczuć',       weights: { NORMALNA: 3 } },
      { label: 'Lekko piecze lub robi się czerwona',  weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Jak wyglądają Twoje pory?',
    answers: [
      { label: 'Prawie niewidoczne, skóra matowa',     weights: { SUCHA: 2, NORMALNA: 1 } },
      { label: 'Duże i widoczne na całej twarzy',      weights: { TLUSTA: 3 } },
      { label: 'Duże tylko w strefie T (nos/czoło)',   weights: { MIESZANA: 3 } },
      { label: 'Małe, ledwo widoczne',                 weights: { NORMALNA: 2 } },
      { label: 'Widoczne naczynka, skóra reaktywna',   weights: { WRAZLIWA: 2 } },
    ],
  },
  {
    text: 'Jak często masz wypryski lub niedoskonałości?',
    answers: [
      { label: 'Rzadko — skóra jest raczej sucha',    weights: { SUCHA: 2 } },
      { label: 'Często, na całej powierzchni twarzy', weights: { TLUSTA: 3 } },
      { label: 'Głównie w strefie T',                  weights: { MIESZANA: 3 } },
      { label: 'Sporadycznie',                         weights: { NORMALNA: 2 } },
      { label: 'Reakcje alergiczne lub podrażnienia',  weights: { WRAZLIWA: 2 } },
    ],
  },
  {
    text: 'Jak reaguje Twoja skóra na nowe kosmetyki?',
    answers: [
      { label: 'Szybko wchłania i chce więcej',        weights: { SUCHA: 2 } },
      { label: 'Zatyka pory, pojawia się połysk',      weights: { TLUSTA: 2 } },
      { label: 'Różnie w zależności od strefy twarzy', weights: { MIESZANA: 2 } },
      { label: 'Zazwyczaj bez żadnej reakcji',         weights: { NORMALNA: 3 } },
      { label: 'Często podrażnienie lub zaczerwienienie', weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Jak wygląda Twoja skóra w ciągu dnia bez makijażu?',
    answers: [
      { label: 'Matowa, czasem się łuszczy',           weights: { SUCHA: 3 } },
      { label: 'Błyszcząca, wyraźnie tłusta',          weights: { TLUSTA: 3 } },
      { label: 'Tłusta w środku twarzy, sucha na bokach', weights: { MIESZANA: 3 } },
      { label: 'Równomierna, zdrowo wyglądająca',      weights: { NORMALNA: 3 } },
      { label: 'Zaczerwieniona, widoczne naczynka',    weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Jak reaguje Twoja skóra na mróz, wiatr lub intensywne słońce?',
    answers: [
      { label: 'Bardzo się suszy, piecze i łuszczy',   weights: { SUCHA: 3 } },
      { label: 'Przetłuszcza się jeszcze bardziej',    weights: { TLUSTA: 2 } },
      { label: 'Różnie — zależy od strefy twarzy',     weights: { MIESZANA: 2 } },
      { label: 'Lekko reaguje, szybko wraca do normy', weights: { NORMALNA: 2 } },
      { label: 'Silne zaczerwienienia i pieczenie',    weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Co czujesz podczas nakładania kremu?',
    answers: [
      { label: 'Skóra "pije" krem i chce więcej',      weights: { SUCHA: 3 } },
      { label: 'Długo się wchłania, zostaje tłusta warstwa', weights: { TLUSTA: 3 } },
      { label: 'Inaczej w różnych miejscach twarzy',   weights: { MIESZANA: 3 } },
      { label: 'Krem wchłania się normalnie',           weights: { NORMALNA: 3 } },
      { label: 'Często pieczenie lub swędzenie',        weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Czy masz skłonność do zaczerwienień lub widocznych naczynek?',
    answers: [
      { label: 'Nie — skóra sucha, ale bez zaczerwienień', weights: { SUCHA: 1 } },
      { label: 'Nie — głównym problemem jest tłustość', weights: { TLUSTA: 1 } },
      { label: 'Nie — głównym problemem jest strefa T', weights: { MIESZANA: 1 } },
      { label: 'Nie — skóra jest zrównoważona',        weights: { NORMALNA: 2 } },
      { label: 'Tak — często się czerwienię',          weights: { WRAZLIWA: 3 } },
    ],
  },
];

export const SKIN_TYPE_INFO: Record<SkinTypeKey, { label: string; emoji: string; desc: string }> = {
  SUCHA:    { label: 'Sucha',    emoji: '🌵', desc: 'Łuszczy się, ciągnie, potrzebuje intensywnego nawilżenia.' },
  TLUSTA:   { label: 'Tłusta',   emoji: '✨', desc: 'Skłonna do połysku i rozszerzonych porów, wymaga matowania.' },
  MIESZANA: { label: 'Mieszana', emoji: '⚖️', desc: 'Strefa T przetłuszczona, policzki normalne lub suche.' },
  NORMALNA: { label: 'Normalna', emoji: '🌸', desc: 'Zrównoważona, bez problemów — wymaga podtrzymania.' },
  WRAZLIWA: { label: 'Wrażliwa', emoji: '🌹', desc: 'Reaktywna, łatwo się czerwieni i podrażnia.' },
};

const SKIN_CONCERNS = [
  { value: 'NAWODNIENIE',     label: 'Nawodnienie' },
  { value: 'PRZEBARWIENIA',   label: 'Przebarwienia' },
  { value: 'TRADZIK',         label: 'Trądzik' },
  { value: 'STARZENIE',       label: 'Starzenie' },
  { value: 'WRAZLIWOSC',      label: 'Wrażliwość' },
  { value: 'PRZETLUSZCZANIE', label: 'Przetłuszczanie' },
  { value: 'ZACZERWIENIENIA', label: 'Zaczerwienienia' },
];

// ─── Scoring logic ────────────────────────────────────────────────────────────

export function computeSkinType(selectedAnswerIndexes: number[]): {
  winner: SkinTypeKey;
  scores: Record<SkinTypeKey, number>;
  tiedWith: SkinTypeKey | null;
} {
  const scores: Record<SkinTypeKey, number> = { SUCHA: 0, TLUSTA: 0, MIESZANA: 0, NORMALNA: 0, WRAZLIWA: 0 };

  selectedAnswerIndexes.forEach((answerIdx, questionIdx) => {
    const question = QUIZ_QUESTIONS[questionIdx];
    if (!question) return;
    const answer = question.answers[answerIdx];
    if (!answer) return;
    for (const [type, pts] of Object.entries(answer.weights) as [SkinTypeKey, number][]) {
      scores[type] += pts;
    }
  });

  const sorted = (Object.keys(scores) as SkinTypeKey[]).sort((a, b) => scores[b] - scores[a]);
  const winner = sorted[0];
  const runnerUp = sorted[1];
  const tiedWith = scores[winner] === scores[runnerUp] ? runnerUp : null;

  return { winner, scores, tiedWith };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (skinType: string, skinConcerns: string[]) => void;
  isSubmitting?: boolean;
}

type Step = { kind: 'question'; index: number } | { kind: 'result' } | { kind: 'concerns' };

export const SkinTypeQuiz = ({ onComplete, isSubmitting }: Props) => {
  const [step, setStep] = useState<Step>({ kind: 'question', index: 0 });
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ_QUESTIONS.length).fill(null));
  const [detectedType, setDetectedType] = useState<SkinTypeKey | null>(null);
  const [tiedWith, setTiedWith] = useState<SkinTypeKey | null>(null);
  const [selectedType, setSelectedType] = useState<SkinTypeKey | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);

  const totalSteps = QUIZ_QUESTIONS.length;

  const handleAnswer = (answerIdx: number) => {
    if (step.kind !== 'question') return;
    const newAnswers = [...answers];
    newAnswers[step.index] = answerIdx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (step.kind !== 'question') return;
    const currentAnswer = answers[step.index];
    if (currentAnswer === null) return;

    if (step.index < totalSteps - 1) {
      setStep({ kind: 'question', index: step.index + 1 });
    } else {
      // Compute result
      const { winner, tiedWith: tied } = computeSkinType(answers as number[]);
      setDetectedType(winner);
      setTiedWith(tied);
      setSelectedType(winner);
      setStep({ kind: 'result' });
    }
  };

  const handleBack = () => {
    if (step.kind === 'question' && step.index > 0) {
      setStep({ kind: 'question', index: step.index - 1 });
    } else if (step.kind === 'result') {
      setStep({ kind: 'question', index: totalSteps - 1 });
    } else if (step.kind === 'concerns') {
      setStep({ kind: 'result' });
    }
  };

  const toggleConcern = (val: string) =>
    setConcerns(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);

  // ── Render: Question step ──
  if (step.kind === 'question') {
    const q = QUIZ_QUESTIONS[step.index];
    const selected = answers[step.index];
    const progress = ((step.index) / totalSteps) * 100;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Pytanie {step.index + 1} z {totalSteps}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <p className="text-base font-semibold leading-snug">{q.text}</p>

        {/* Answers */}
        <div className="space-y-2">
          {q.answers.map((a, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                selected === i
                  ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-900/20 text-foreground ring-1 ring-sky-500/30'
                  : 'border-border/50 hover:border-border hover:bg-muted/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          {step.index > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-muted/30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Wstecz
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={selected === null}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-40 ml-auto"
          >
            {step.index === totalSteps - 1 ? 'Zobacz wynik' : 'Dalej'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Result step ──
  if (step.kind === 'result') {
    const info = selectedType ? SKIN_TYPE_INFO[selectedType] : null;

    return (
      <div className="space-y-6">
        <div>
          <div className="h-1.5 bg-sky-500 rounded-full" />
          <p className="text-xs text-muted-foreground mt-1 text-right">Wynik</p>
        </div>

        <div className="text-center py-2">
          <div className="text-5xl mb-3">{info?.emoji}</div>
          <p className="text-xs text-muted-foreground mb-1">Twój typ skóry to</p>
          <h2 className="text-2xl font-bold">{info?.label}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">{info?.desc}</p>
        </div>

        {/* Tie-break: exact score tie */}
        {tiedWith && detectedType && (
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-3">
              Twoje odpowiedzi wskazują równie silnie na dwa typy. Wybierz ten, który bardziej Ci odpowiada:
            </p>
            <div className="flex gap-2">
              {[detectedType, tiedWith].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    selectedType === t
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  {SKIN_TYPE_INFO[t].emoji} {SKIN_TYPE_INFO[t].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual override */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Nie zgadzasz się z wynikiem? Zmień ręcznie:</p>
          <select
            value={selectedType ?? ''}
            onChange={e => setSelectedType(e.target.value as SkinTypeKey)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl"
          >
            {(Object.keys(SKIN_TYPE_INFO) as SkinTypeKey[]).map(t => (
              <option key={t} value={t}>{SKIN_TYPE_INFO[t].label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-muted/30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Wstecz
          </button>
          <button
            onClick={() => setStep({ kind: 'concerns' })}
            disabled={!selectedType}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-40 ml-auto"
          >
            Dalej <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Concerns step ──
  return (
    <div className="space-y-6">
      <div>
        <div className="h-1.5 bg-sky-500 rounded-full" />
        <p className="text-xs text-muted-foreground mt-1 text-right">Ostatni krok</p>
      </div>

      <div>
        <p className="text-base font-semibold">Czy masz dodatkowe problemy skórne?</p>
        <p className="text-sm text-muted-foreground mt-1">Opcjonalnie — możesz pominąć.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SKIN_CONCERNS.map(c => (
          <button
            key={c.value}
            onClick={() => toggleConcern(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              concerns.includes(c.value)
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {concerns.includes(c.value) && <Check className="inline h-3 w-3 mr-1" />}
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-muted/30 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Wstecz
        </button>
        <button
          onClick={() => onComplete(selectedType!, concerns)}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 ml-auto"
        >
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz profil'}
          {!isSubmitting && <Check className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default SkinTypeQuiz;
```

- [ ] **Step 2: Verify it compiles**

Start the frontend dev server and check for TypeScript errors:

```bash
cd apps/web
pnpm dev
```

Expected: No TypeScript errors in the console for `SkinTypeQuiz.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/skin-weather/SkinTypeQuiz.tsx
git commit -m "feat: add SkinTypeQuiz component with 8-question scoring wizard"
```

---

## Task 6: Rebuild SkinWeatherProfile page

**Files:**
- Modify: `apps/web/src/pages/user/SkinWeatherProfile.tsx`

The page is rebuilt to:
- Show `<SkinTypeQuiz />` when no profile exists
- Show restructured layout (Sekcja A: type + advice / Sekcja B: weather report / Sekcja C: history / collapsible settings) when profile exists

- [ ] **Step 1: Replace the file contents**

Replace the entire content of `apps/web/src/pages/user/SkinWeatherProfile.tsx` with:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import {
  Cloud, Sun, MapPin, Bell, BellOff,
  ChevronDown, ChevronUp, Loader2, RefreshCw, Settings, Pencil, X,
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
            disabled={refreshMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {refreshMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Odśwież raport
          </button>
        </div>
      ) : (
        <>
          {sections.map((s: any, i: number) => <SectionCard key={i} section={s} />)}
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/30 hover:text-foreground transition-colors disabled:opacity-50 mt-1"
          >
            {refreshMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
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
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                {sections.length === 0
                  ? <p className="text-xs text-muted-foreground">Brak wskazówek.</p>
                  : sections.map((s: any, i: number) => <SectionCard key={i} section={s} />)}
              </div>
            )}
          </div>
        );
      })}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40 transition-colors">Poprzednia</button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40 transition-colors">Następna</button>
        </div>
      )}
    </div>
  );
}

// ─── Skin Type Section (Section A) ────────────────────────────────────────────

type ChangeMode = null | 'quiz' | 'manual';

function SkinTypeSection({ profile }: { profile: any }) {
  const qc = useQueryClient();
  const [changeMode, setChangeMode] = useState<ChangeMode>(null);
  const [manualType, setManualType] = useState<string>(profile.skinType ?? 'NORMALNA');

  const { data: adviceList } = useQuery<any[]>({
    queryKey: ['skin-weather', 'advice'],
    queryFn: skinWeatherApi.getSkinTypeAdvice,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { skinType: string; skinConcerns?: string[] }) =>
      skinWeatherApi.upsertProfile({
        skinType: data.skinType,
        skinConcerns: data.skinConcerns ?? profile.skinConcerns ?? [],
        locationLat: Number(profile.locationLat) || 0,
        locationLng: Number(profile.locationLng) || 0,
        cityName: profile.cityName || 'Wykrywanie...',
        notificationsEnabled: profile.notificationsEnabled ?? false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather'] });
      setChangeMode(null);
      toast.success('Typ skóry zaktualizowany');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const skinType: string = profile.skinType ?? 'NORMALNA';
  const info = SKIN_TYPE_INFO[skinType as keyof typeof SKIN_TYPE_INFO];
  const myAdvice = adviceList?.find((a: any) => a.skinType === skinType);

  return (
    <div className="space-y-4">
      {/* Type display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{info?.emoji}</span>
          <div>
            <p className="text-xs text-muted-foreground">Twój typ skóry</p>
            <p className="font-semibold">{info?.label ?? skinType}</p>
          </div>
        </div>
        {!changeMode && (
          <button
            onClick={() => setChangeMode('manual')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/30 transition-colors"
          >
            <Pencil className="h-3 w-3" /> Zmień
          </button>
        )}
        {changeMode && (
          <button onClick={() => setChangeMode(null)} className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Change panel */}
      {changeMode === 'manual' && (
        <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setChangeMode('quiz')}
              className="flex-1 py-2 text-xs border border-border rounded-lg hover:bg-muted/30 transition-colors"
            >
              Wykonaj quiz ponownie
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">lub wybierz ręcznie:</p>
          <select
            value={manualType}
            onChange={e => setManualType(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl"
          >
            {SKIN_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={() => saveMutation.mutate({ skinType: manualType })}
            disabled={saveMutation.isPending}
            className="w-full py-2 text-sm bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      )}

      {changeMode === 'quiz' && (
        <div className="p-4 rounded-xl bg-card border border-border">
          <SkinTypeQuiz
            onComplete={(skinType, skinConcerns) => saveMutation.mutate({ skinType, skinConcerns })}
            isSubmitting={saveMutation.isPending}
          />
        </div>
      )}

      {/* Admin advice */}
      {!changeMode && (
        <div className="pt-1">
          {myAdvice?.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{myAdvice.content}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Administrator nie dodał jeszcze porad dla tego typu skóry.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Collapsible Profile Settings ─────────────────────────────────────────────

function ProfileSettings({ profile }: { profile: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [skinConcerns, setSkinConcerns] = useState<string[]>(profile.skinConcerns ?? []);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(profile.notificationsEnabled ?? false);

  const saveMutation = useMutation({
    mutationFn: () =>
      skinWeatherApi.upsertProfile({
        skinType: profile.skinType,
        skinConcerns,
        locationLat: Number(profile.locationLat) || 0,
        locationLng: Number(profile.locationLng) || 0,
        cityName: profile.cityName || 'Wykrywanie...',
        notificationsEnabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'profile'] });
      toast.success('Ustawienia zapisane');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const toggleConcern = (val: string) =>
    setSkinConcerns(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Ustawienia profilu</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-border/50">
          {/* Skin concerns */}
          <div className="pt-4">
            <p className="text-sm font-semibold mb-3">Problemy skórne <span className="text-muted-foreground font-normal">(opcjonalnie)</span></p>
            <div className="flex flex-wrap gap-2">
              {SKIN_CONCERNS.map(c => (
                <button
                  key={c.value}
                  onClick={() => toggleConcern(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    skinConcerns.includes(c.value)
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Powiadomienia push</p>
                <p className="text-xs text-muted-foreground">Codzienny raport o 6:00</p>
              </div>
            </div>
            <button
              onClick={() => setNotificationsEnabled(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${notificationsEnabled ? 'bg-foreground' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform ${notificationsEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 bg-sky-50/60 dark:bg-sky-900/10 rounded-xl border border-sky-200/60 dark:border-sky-800/40">
            <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Lokalizacja wykrywana automatycznie</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.cityName && profile.cityName !== 'Wykrywanie...' ? `Aktualna: ${profile.cityName}` : 'Zostanie pobrana z GPS przy każdym wejściu.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Zapisz zmiany
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SkinWeatherProfile = () => {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'profile'],
    queryFn: skinWeatherApi.getProfile,
    retry: false,
  });

  useSkinWeatherLocation(true);

  const createProfileMutation = useMutation({
    mutationFn: ({ skinType, skinConcerns }: { skinType: string; skinConcerns: string[] }) =>
      skinWeatherApi.upsertProfile({
        skinType,
        skinConcerns,
        locationLat: 0,
        locationLng: 0,
        cityName: 'Wykrywanie...',
        notificationsEnabled: false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather'] });
      toast.success('Profil zapisany! Witaj 🌸');
    },
    onError: () => toast.error('Błąd zapisu profilu'),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Ładowanie...</span>
      </div>
    );
  }

  // ── First visit: show quiz ──
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-2xl">
            <Cloud className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Twoja Skóra</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Odpowiedz na kilka pytań, aby wyznaczyć swój typ skóry i otrzymywać spersonalizowane porady.
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <SkinTypeQuiz
            onComplete={(skinType, skinConcerns) => createProfileMutation.mutate({ skinType, skinConcerns })}
            isSubmitting={createProfileMutation.isPending}
          />
        </div>
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

      {/* Section A: Skin type + admin advice */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading text-base font-semibold mb-5">Twój typ skóry</h2>
        <SkinTypeSection profile={profile} />
      </section>

      {/* Section B: Weather report */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Sun className="h-4 w-4 text-amber-500" />
          <h2 className="font-heading text-base font-semibold">Raport na dziś</h2>
        </div>
        <TodayReport hasProfile={true} />
      </section>

      {/* Section C: History */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Cloud className="h-4 w-4 text-slate-400" />
          <h2 className="font-heading text-base font-semibold">Historia raportów</h2>
        </div>
        <ReportHistory />
      </section>

      {/* Collapsible settings */}
      <ProfileSettings profile={profile} />
    </div>
  );
};

export default SkinWeatherProfile;
```

- [ ] **Step 2: Verify in browser**

Navigate to `/user/pogoda-skory`. Verify:
- With no profile → quiz wizard shows
- After completing quiz → profile saved, layout switches to sections A/B/C
- Section A shows skin type chip + admin advice (or placeholder)
- "Zmień" button expands inline panel
- Collapsible settings works

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/user/SkinWeatherProfile.tsx
git commit -m "feat: rebuild SkinWeatherProfile with quiz onboarding and new layout"
```

---

## Task 7: Admin — Porady tab in SkinWeatherRules

**Files:**
- Modify: `apps/web/src/pages/admin/SkinWeatherRules.tsx`

- [ ] **Step 1: Add tab state and SkinTypeAdvice tab**

At the top of `apps/web/src/pages/admin/SkinWeatherRules.tsx`, after the existing imports, add:

```tsx
import { skinWeatherApi } from '@/api/skin-weather.api';
// (already imported — verify it is)
```

In `SkinWeatherRules` (the main export component), wrap the existing content with a tab switcher. Find the main return JSX (the outermost `div`) and replace it:

```tsx
// At top of component, add state:
const [activeTab, setActiveTab] = useState<'rules' | 'advice'>('rules');
```

Wrap the existing return value to add tabs header and a new `SkinTypeAdviceTab` component. The existing rules UI moves inside `activeTab === 'rules'`.

Add the `SkinTypeAdviceTab` component above the main export:

```tsx
const SKIN_TYPE_ADVICE_META = [
  { key: 'SUCHA',    label: 'Sucha',    emoji: '🌵', desc: 'Łuszczy się, ciągnie, potrzebuje nawilżenia' },
  { key: 'TLUSTA',   label: 'Tłusta',   emoji: '✨', desc: 'Połysk, rozszerzone pory, przetłuszczanie' },
  { key: 'MIESZANA', label: 'Mieszana', emoji: '⚖️', desc: 'Strefa T tłusta, reszta normalna lub sucha' },
  { key: 'NORMALNA', label: 'Normalna', emoji: '🌸', desc: 'Zrównoważona, bez problemów' },
  { key: 'WRAZLIWA', label: 'Wrażliwa', emoji: '🌹', desc: 'Reaktywna, łatwo się czerwieni, podrażniona' },
];

function SkinTypeAdviceTab() {
  const qc = useQueryClient();
  const { data: adviceList, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'skin-type-advice'],
    queryFn: skinWeatherApi.getSkinTypeAdvice,
  });

  const [contents, setContents] = useState<Record<string, string>>({});

  // Initialize local state when data loads
  useEffect(() => {
    if (adviceList) {
      const map: Record<string, string> = {};
      adviceList.forEach((a: any) => { map[a.skinType] = a.content; });
      setContents(map);
    }
  }, [adviceList]);

  const saveMutation = useMutation({
    mutationFn: ({ skinType, content }: { skinType: string; content: string }) =>
      skinWeatherApi.updateSkinTypeAdvice(skinType, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'skin-type-advice'] });
      toast.success('Porady zapisane');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Ładowanie...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wpisz porady pielęgnacyjne dla każdego typu skóry. Użytkownicy zobaczą treść dopasowaną do swojego typu.
        Puste pole oznacza brak porad dla danego typu.
      </p>
      {SKIN_TYPE_ADVICE_META.map(meta => {
        const advice = adviceList?.find((a: any) => a.skinType === meta.key);
        return (
          <div key={meta.key} className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{meta.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.desc}</p>
              </div>
              {advice?.updatedAt && (
                <p className="ml-auto text-[10px] text-muted-foreground/60">
                  Aktualizacja: {new Date(advice.updatedAt).toLocaleDateString('pl-PL')}
                </p>
              )}
            </div>
            <textarea
              value={contents[meta.key] ?? ''}
              onChange={e => setContents(prev => ({ ...prev, [meta.key]: e.target.value }))}
              rows={4}
              placeholder={`Porady dla skóry ${meta.label.toLowerCase()}...`}
              className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl resize-y focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={() => saveMutation.mutate({ skinType: meta.key, content: contents[meta.key] ?? '' })}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

Add missing imports at the top of the file:
```tsx
import { useEffect } from 'react';
// useQuery, useMutation, useQueryClient — already imported (verify)
```

- [ ] **Step 2: Add tab switcher to main component**

In the `SkinWeatherRules` component, add `activeTab` state and the tab switcher UI at the top of the return:

```tsx
const [activeTab, setActiveTab] = useState<'rules' | 'advice'>('rules');
```

In the return JSX, wrap with:

```tsx
<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="font-heading text-2xl font-semibold">Twoja Skóra — Admin</h1>
  </div>

  {/* Tab switcher */}
  <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/40 w-fit">
    <button
      onClick={() => setActiveTab('rules')}
      className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${activeTab === 'rules' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
    >
      Reguły pogodowe
    </button>
    <button
      onClick={() => setActiveTab('advice')}
      className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${activeTab === 'advice' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
    >
      Porady dla typów skóry
    </button>
  </div>

  {activeTab === 'rules' ? (
    /* existing rules UI goes here */
    <ExistingRulesContent />
  ) : (
    <SkinTypeAdviceTab />
  )}
</div>
```

Note: The existing rules content (rule list, add form, etc.) should be extracted into a local `ExistingRulesContent` component or kept inline under `activeTab === 'rules'`. The simplest approach: wrap the existing return body (excluding the outer `div` wrapper) in a fragment under `activeTab === 'rules'`.

- [ ] **Step 3: Verify in browser**

Navigate to `/admin/pogoda-skory`. Verify:
- Two tabs visible: "Reguły pogodowe" and "Porady dla typów skóry"
- Existing rules tab works as before
- Advice tab shows 5 cards, each with a textarea
- Saving a card updates content and shows toast

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/admin/SkinWeatherRules.tsx
git commit -m "feat: add skin type advice tab to admin SkinWeatherRules page"
```

---

## Task 8: Final integration check

- [ ] **Run all backend tests**

```bash
cd apps/server
pnpm test
```

Expected: All tests pass (including new `skin-weather.service.test.ts`).

- [ ] **End-to-end flow check**

1. Log in as a new user (or clear `SkinWeatherProfile` from DB for test user)
2. Navigate to `/user/pogoda-skory` → quiz wizard appears
3. Complete 8 questions → result screen shows detected type
4. Optionally change type manually → continue
5. Select skin concerns → "Zapisz profil" → redirect to main layout
6. Section A shows type + advice (empty initially)
7. Log in as admin → `/admin/pogoda-skory` → "Porady" tab → add advice for the user's type → save
8. Log back in as user → Section A shows admin advice

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete skin type quiz and advice feature"
```

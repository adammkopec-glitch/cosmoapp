import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkinTypeKey = 'SUCHA' | 'TLUSTA' | 'MIESZANA' | 'NORMALNA' | 'WRAZLIWA';

interface QuizAnswer {
  text: string;
  weights: Partial<Record<SkinTypeKey, number>>;
}

interface QuizQuestion {
  text: string;
  answers: QuizAnswer[];
}

interface SkinTypeInfoEntry {
  label: string;
  emoji: string;
  desc: string;
}

interface ComputeResult {
  winner: SkinTypeKey;
  scores: Record<SkinTypeKey, number>;
  tiedWith: SkinTypeKey | null;
}

type Step =
  | { kind: 'question'; index: number }
  | { kind: 'result' }
  | { kind: 'concerns' };

interface Props {
  onComplete: (skinType: string, skinConcerns: string[]) => void;
  isSubmitting?: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    text: 'Jak czuje się Twoja skóra 2–3 godziny po myciu?',
    answers: [
      { text: 'Napięta, ciągnie, szorstka',           weights: { SUCHA: 3 } },
      { text: 'Lśni, czuć wyraźne przetłuszczenie',   weights: { TLUSTA: 3 } },
      { text: 'Lśni tylko nos, czoło lub broda',      weights: { MIESZANA: 3 } },
      { text: 'Komfortowo, bez żadnych odczuć',       weights: { NORMALNA: 3 } },
      { text: 'Lekko piecze lub robi się czerwona',   weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Jak wyglądają Twoje pory?',
    answers: [
      { text: 'Prawie niewidoczne, skóra matowa',            weights: { SUCHA: 2, NORMALNA: 1 } },
      { text: 'Duże i widoczne na całej twarzy',             weights: { TLUSTA: 3 } },
      { text: 'Duże tylko w strefie T (nos/czoło)',          weights: { MIESZANA: 3 } },
      { text: 'Małe, ledwo widoczne',                        weights: { NORMALNA: 2 } },
      { text: 'Widoczne naczynka, skóra reaktywna',          weights: { WRAZLIWA: 2 } },
    ],
  },
  {
    text: 'Jak często masz wypryski lub niedoskonałości?',
    answers: [
      { text: 'Rzadko — skóra jest raczej sucha',           weights: { SUCHA: 2 } },
      { text: 'Często, na całej powierzchni twarzy',        weights: { TLUSTA: 3 } },
      { text: 'Głównie w strefie T',                        weights: { MIESZANA: 3 } },
      { text: 'Sporadycznie',                               weights: { NORMALNA: 2 } },
      { text: 'Reakcje alergiczne lub podrażnienia',        weights: { WRAZLIWA: 2 } },
    ],
  },
  {
    text: 'Jak reaguje Twoja skóra na nowe kosmetyki?',
    answers: [
      { text: 'Szybko wchłania i chce więcej',                     weights: { SUCHA: 2 } },
      { text: 'Zatyka pory, pojawia się połysk',                   weights: { TLUSTA: 2 } },
      { text: 'Różnie w zależności od strefy twarzy',             weights: { MIESZANA: 2 } },
      { text: 'Zazwyczaj bez żadnej reakcji',                      weights: { NORMALNA: 3 } },
      { text: 'Często podrażnienie lub zaczerwienienie',           weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Jak wygląda Twoja skóra w ciągu dnia bez makijażu?',
    answers: [
      { text: 'Matowa, czasem się łuszczy',                        weights: { SUCHA: 3 } },
      { text: 'Błyszcząca, wyraźnie tłusta',                       weights: { TLUSTA: 3 } },
      { text: 'Tłusta w środku twarzy, sucha na bokach',           weights: { MIESZANA: 3 } },
      { text: 'Równomierna, zdrowo wyglądająca',                   weights: { NORMALNA: 3 } },
      { text: 'Zaczerwieniona, widoczne naczynka',                 weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Jak reaguje Twoja skóra na mróz, wiatr lub intensywne słońce?',
    answers: [
      { text: 'Bardzo się suszy, piecze i łuszczy',        weights: { SUCHA: 3 } },
      { text: 'Przetłuszcza się jeszcze bardziej',         weights: { TLUSTA: 2 } },
      { text: 'Różnie — zależy od strefy twarzy',          weights: { MIESZANA: 2 } },
      { text: 'Lekko reaguje, szybko wraca do normy',      weights: { NORMALNA: 2 } },
      { text: 'Silne zaczerwienienia i pieczenie',         weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Co czujesz podczas nakładania kremu?',
    answers: [
      { text: 'Skóra "pije" krem i chce więcej',                  weights: { SUCHA: 3 } },
      { text: 'Długo się wchłania, zostaje tłusta warstwa',       weights: { TLUSTA: 3 } },
      { text: 'Inaczej w różnych miejscach twarzy',               weights: { MIESZANA: 3 } },
      { text: 'Krem wchłania się normalnie',                      weights: { NORMALNA: 3 } },
      { text: 'Często pieczenie lub swędzenie',                   weights: { WRAZLIWA: 3 } },
    ],
  },
  {
    text: 'Czy masz skłonność do zaczerwienień lub widocznych naczynek?',
    answers: [
      { text: 'Nie — skóra sucha, ale bez zaczerwienień',         weights: { SUCHA: 1 } },
      { text: 'Nie — głównym problemem jest tłustość',            weights: { TLUSTA: 1 } },
      { text: 'Nie — głównym problemem jest strefa T',            weights: { MIESZANA: 1 } },
      { text: 'Nie — skóra jest zrównoważona',                    weights: { NORMALNA: 2 } },
      { text: 'Tak — często się czerwienię',                      weights: { WRAZLIWA: 3 } },
    ],
  },
];

export const SKIN_TYPE_INFO: Record<SkinTypeKey, SkinTypeInfoEntry> = {
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

const ALL_SKIN_TYPE_KEYS: SkinTypeKey[] = ['SUCHA', 'TLUSTA', 'MIESZANA', 'NORMALNA', 'WRAZLIWA'];

// ─── Pure scoring function ────────────────────────────────────────────────────

export function computeSkinType(answers: number[]): ComputeResult {
  const scores: Record<SkinTypeKey, number> = {
    SUCHA: 0, TLUSTA: 0, MIESZANA: 0, NORMALNA: 0, WRAZLIWA: 0,
  };

  for (let qi = 0; qi < answers.length; qi++) {
    const ai = answers[qi];
    const question = QUIZ_QUESTIONS[qi];
    if (!question) continue;
    const answer = question.answers[ai];
    if (!answer) continue;
    for (const [type, weight] of Object.entries(answer.weights) as [SkinTypeKey, number][]) {
      scores[type] += weight;
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  const topKeys = ALL_SKIN_TYPE_KEYS.filter(k => scores[k] === maxScore);

  const winner = topKeys[0];
  const tiedWith: SkinTypeKey | null = topKeys.length === 2 ? topKeys[1] : null;

  return { winner, scores, tiedWith };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SkinTypeQuiz({ onComplete, isSubmitting = false }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'question', index: 0 });
  // answers[i] = selected answer index for question i, or -1 if not answered
  const [answers, setAnswers] = useState<number[]>(Array(8).fill(-1));
  const [overrideSkinType, setOverrideSkinType] = useState<SkinTypeKey | null>(null);
  const [skinConcerns, setSkinConcerns] = useState<string[]>([]);

  // ── Derived state ──

  const progressPct =
    step.kind === 'question'
      ? Math.round((step.index / 8) * 100)
      : 100;

  const result = step.kind !== 'question' ? computeSkinType(answers) : null;
  const finalSkinType: SkinTypeKey =
    overrideSkinType ?? (result?.winner ?? 'NORMALNA');

  // ── Handlers ──

  function selectAnswer(answerIndex: number) {
    if (step.kind !== 'question') return;
    const next = [...answers];
    next[step.index] = answerIndex;
    setAnswers(next);
  }

  function goBack() {
    if (step.kind === 'concerns') {
      setStep({ kind: 'result' });
      return;
    }
    if (step.kind === 'result') {
      setStep({ kind: 'question', index: 7 });
      return;
    }
    if (step.kind === 'question' && step.index > 0) {
      setStep({ kind: 'question', index: step.index - 1 });
    }
  }

  function goNext() {
    if (step.kind === 'question') {
      const isLast = step.index === 7;
      if (isLast) {
        setStep({ kind: 'result' });
      } else {
        setStep({ kind: 'question', index: step.index + 1 });
      }
      return;
    }
    if (step.kind === 'result') {
      setStep({ kind: 'concerns' });
    }
  }

  function toggleConcern(val: string) {
    setSkinConcerns(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val],
    );
  }

  function handleSave() {
    onComplete(finalSkinType, skinConcerns);
  }

  // ── Render helpers ──

  const canGoBack =
    step.kind === 'concerns' ||
    step.kind === 'result' ||
    (step.kind === 'question' && step.index > 0);

  const canGoNext =
    step.kind === 'question' && answers[step.index] !== -1;

  // ── Render ──

  return (
    <div className="space-y-6">

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {step.kind === 'question'
              ? `Pytanie ${step.index + 1} z 8`
              : step.kind === 'result'
              ? 'Twój wynik'
              : 'Problemy skórne'}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Question step ── */}
      {step.kind === 'question' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold leading-snug">
            {QUIZ_QUESTIONS[step.index].text}
          </p>
          <div className="space-y-2">
            {QUIZ_QUESTIONS[step.index].answers.map((answer, ai) => {
              const selected = answers[step.index] === ai;
              return (
                <button
                  key={ai}
                  onClick={() => selectAnswer(ai)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selected
                      ? 'border-foreground bg-foreground/5 ring-1 ring-foreground/20 font-medium'
                      : 'border-border/50 hover:border-border hover:bg-muted/20'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        selected
                          ? 'border-foreground bg-foreground'
                          : 'border-border'
                      }`}
                    >
                      {selected && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                    </span>
                    {answer.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Result step ── */}
      {step.kind === 'result' && result && (
        <div className="space-y-5">
          {/* Winner card */}
          <div className="rounded-2xl border border-border bg-muted/20 p-6 text-center space-y-2">
            <div className="text-5xl leading-none mb-3">
              {SKIN_TYPE_INFO[finalSkinType].emoji}
            </div>
            <p className="text-lg font-semibold">{SKIN_TYPE_INFO[finalSkinType].label}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SKIN_TYPE_INFO[finalSkinType].desc}
            </p>
          </div>

          {/* Tie-break panel */}
          {result.tiedWith !== null && (
            <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                Remis z typem: {SKIN_TYPE_INFO[result.tiedWith].label} {SKIN_TYPE_INFO[result.tiedWith].emoji}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                Obydwa typy uzyskały tyle samo punktów. Możesz wybrać właściwy poniżej.
              </p>
            </div>
          )}

          {/* Manual override */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Zmień typ ręcznie (opcjonalnie)
            </label>
            <select
              value={overrideSkinType ?? result.winner}
              onChange={e => setOverrideSkinType(e.target.value as SkinTypeKey)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            >
              {ALL_SKIN_TYPE_KEYS.map(key => (
                <option key={key} value={key}>
                  {SKIN_TYPE_INFO[key].emoji} {SKIN_TYPE_INFO[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Concerns step ── */}
      {step.kind === 'concerns' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1">Problemy skórne</p>
            <p className="text-xs text-muted-foreground">
              Zaznacz te, które Cię dotyczą{' '}
              <span className="italic">(opcjonalnie)</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SKIN_CONCERNS.map(c => {
              const selected = skinConcerns.includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => toggleConcern(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-1">
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground border border-border/50 rounded-xl hover:bg-muted/30 hover:text-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
          Wstecz
        </button>

        {/* Right-side controls */}
        <div className="flex items-center gap-3">
          {/* Concerns step: skip link + save button */}
          {step.kind === 'concerns' && (
            <>
              <button
                onClick={() => onComplete(finalSkinType, [])}
                disabled={isSubmitting}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Pomiń
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Zapisz profil
              </button>
            </>
          )}

          {/* Result step: continue button */}
          {step.kind === 'result' && (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Dalej
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Question step: next/submit button */}
          {step.kind === 'question' && (
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
            >
              {step.index === 7 ? 'Zobacz wynik' : 'Dalej'}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SkinTypeQuiz;

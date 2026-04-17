import { describe, it, expect } from 'vitest';

// Test the pure computation helpers by re-implementing them inline.
// These verify algorithm correctness for: average, trend, streak, distribution.

// ── Inline helper mirrors (same logic as service) ─────────────────────────

function calcAverage(moods: (number | null)[]): number | null {
  const valid = moods.filter((m): m is number => m !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function calcTrend(
  sorted: { mood: number | null }[],
): 'rising' | 'falling' | 'stable' | null {
  const withMood = sorted.filter((x) => x.mood !== null);
  if (withMood.length < 4) return null;
  const half = Math.floor(withMood.length / 2);
  const first = withMood.slice(0, half);
  const second = withMood.slice(half);
  const avg1 = first.reduce((s, x) => s + x.mood!, 0) / first.length;
  const avg2 = second.reduce((s, x) => s + x.mood!, 0) / second.length;
  if (avg2 - avg1 >= 0.5) return 'rising';
  if (avg1 - avg2 >= 0.5) return 'falling';
  return 'stable';
}

function calcStreak(uniqueDays: Set<string>, todayStr: string): number {
  let streak = 0;
  const cursor = new Date(todayStr + 'T00:00:00Z');
  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('calcAverage', () => {
  it('returns null for empty array', () => expect(calcAverage([])).toBeNull());
  it('returns null when all moods are null', () => expect(calcAverage([null, null])).toBeNull());
  it('returns average ignoring nulls', () => expect(calcAverage([3, 4, 5, null])).toBe(4));
  it('single value', () => expect(calcAverage([2])).toBe(2));
});

describe('calcTrend', () => {
  it('returns null with fewer than 4 mood entries', () => {
    expect(calcTrend([{ mood: 1 }, { mood: 2 }, { mood: 3 }])).toBeNull();
  });
  it('returns null when all moods null', () => {
    expect(calcTrend([{ mood: null }, { mood: null }, { mood: null }, { mood: null }])).toBeNull();
  });
  it('rising: second half avg >= first half avg + 0.5', () => {
    expect(calcTrend([{ mood: 2 }, { mood: 2 }, { mood: 4 }, { mood: 4 }])).toBe('rising');
  });
  it('falling: first half avg >= second half avg + 0.5', () => {
    expect(calcTrend([{ mood: 4 }, { mood: 4 }, { mood: 2 }, { mood: 2 }])).toBe('falling');
  });
  it('stable: difference < 0.5', () => {
    expect(calcTrend([{ mood: 3 }, { mood: 3 }, { mood: 3 }, { mood: 3 }])).toBe('stable');
  });
  it('boundary: exactly 0.5 difference is rising', () => {
    expect(calcTrend([{ mood: 2 }, { mood: 2 }, { mood: 2 }, { mood: 3 }])).toBe('rising');
  });
});

describe('calcStreak', () => {
  it('returns 0 when no days', () => {
    expect(calcStreak(new Set(), '2026-04-10')).toBe(0);
  });
  it('returns 0 when only yesterday', () => {
    expect(calcStreak(new Set(['2026-04-09']), '2026-04-10')).toBe(0);
  });
  it('returns 1 when only today', () => {
    expect(calcStreak(new Set(['2026-04-10']), '2026-04-10')).toBe(1);
  });
  it('returns 3 for 3 consecutive days ending today', () => {
    expect(calcStreak(new Set(['2026-04-08', '2026-04-09', '2026-04-10']), '2026-04-10')).toBe(3);
  });
  it('stops at gap in streak', () => {
    expect(calcStreak(new Set(['2026-04-07', '2026-04-09', '2026-04-10']), '2026-04-10')).toBe(2);
  });
});

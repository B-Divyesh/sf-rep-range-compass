import { describe, expect, it } from 'vitest';
import { completeSession, decideProgression, roundWeight } from '../../src/progression';
import { defaultSettings, type DraftSession } from '../../src/types';

function draft(reps: number[], rirs = reps.map(() => 2)): DraftSession {
  return {
    id: 'session-1', startedAt: '2026-08-28T10:00:00.000Z', weight: 40,
    sets: reps.map((value, index) => ({ reps: value, rir: rirs[index], loggedAt: `2026-08-28T10:0${index}:00.000Z` }))
  };
}

describe('double progression', () => {
  it('increases only when every set reaches the top for the all-top rule', () => {
    expect(decideProgression(defaultSettings, draft([12, 12, 12]))).toMatchObject({ advance: true, nextWeight: 42.5 });
    expect(decideProgression(defaultSettings, draft([12, 11, 12]))).toMatchObject({ advance: false, nextWeight: 40 });
  });

  it('supports a total-rep rule and optional RIR floor', () => {
    const settings = { ...defaultSettings, rule: 'total-reps' as const, totalTarget: 34, rirFloor: 2 };
    expect(decideProgression(settings, draft([12, 11, 11], [2, 3, 2])).advance).toBe(true);
    expect(decideProgression(settings, draft([12, 11, 11], [2, 1, 2])).advance).toBe(false);
  });

  it('stores the decision with a completed session', () => {
    expect(completeSession(defaultSettings, draft([10, 10, 10]), '2026-08-28T11:00:00.000Z').decision).toBe('repeat');
    expect(roundWeight(22.5 + 1.25)).toBe(23.75);
  });
});

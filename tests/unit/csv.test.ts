import { describe, expect, it } from 'vitest';
import { exportCsv, importCsv } from '../../src/csv';
import type { Session } from '../../src/types';

const session: Session = {
  id: 'abc', exercise: 'Bench, paused', startedAt: '2026-08-28T10:00:00.000Z', completedAt: '2026-08-28T10:10:00.000Z',
  weight: 60, unit: 'kg', repMin: 8, repMax: 12, rule: 'all-top', decision: 'increase', nextWeight: 62.5,
  sets: [
    { reps: 12, rir: 2, loggedAt: '2026-08-28T10:02:00.000Z' },
    { reps: 12, rir: 1, loggedAt: '2026-08-28T10:05:00.000Z' },
    { reps: 12, rir: 1, loggedAt: '2026-08-28T10:10:00.000Z' }
  ]
};

describe('CSV ownership', () => {
  it('round-trips a session with quoted fields', () => {
    expect(importCsv(exportCsv([session]))).toEqual([{ ...session, sets: session.sets.map((set) => ({ ...set, loggedAt: session.completedAt })) }]);
  });

  it('rejects unrelated or incomplete CSV files', () => {
    expect(() => importCsv('name,reps\nSquat,8')).toThrow(/columns/i);
    expect(() => importCsv('')).toThrow(/no session rows/i);
  });
});

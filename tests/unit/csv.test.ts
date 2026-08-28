import { describe, expect, it } from 'vitest';
import { CSV_HEADERS, exportCsv, importCsv } from '../../src/csv';
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

  it('rejects every UI-forbidden numeric value from the verifier report', () => {
    const invalid = `session_id,exercise,started_at,completed_at,weight,unit,set_number,reps,rir,rep_min,rep_max,rule,decision,next_weight
bad-session,Primary lift,2026-08-28T00:00:00.000Z,2026-08-28T00:01:00.000Z,40,kg,0,-1,99,-8,12,all-top,increase,42.5`;
    expect(() => importCsv(invalid)).toThrow(/Row 2: set number must be a whole number from 1 to 10/);
  });

  it.each([
    ['reps below zero', { reps: '-1' }, /reps must be a whole number from 0 to 100/],
    ['reps above the logger maximum', { reps: '101' }, /reps must be a whole number from 0 to 100/],
    ['fractional reps', { reps: '8.5' }, /reps must be a whole number/],
    ['RIR above the logger maximum', { rir: '11' }, /RIR must be a whole number from 0 to 10/],
    ['negative weight', { weight: '-1' }, /weight must be a number from 0 to 9999/],
    ['over-precise weight', { weight: '40.001' }, /at most two decimal places/],
    ['invalid rep minimum', { rep_min: '0' }, /minimum reps must be a whole number from 1 to 99/],
    ['reversed rep range', { rep_min: '12', rep_max: '8' }, /maximum reps must be greater/],
    ['non-increasing next weight', { next_weight: '40' }, /increase decision must raise/]
  ])('rejects %s', (_name, changes, expected) => {
    const fields: Record<(typeof CSV_HEADERS)[number], string> = {
      session_id: 'abc', exercise: 'Bench press', started_at: session.startedAt, completed_at: session.completedAt,
      weight: '60', unit: 'kg', set_number: '1', reps: '12', rir: '2', rep_min: '8', rep_max: '12',
      rule: 'all-top', decision: 'increase', next_weight: '62.5'
    };
    Object.assign(fields, changes);
    const row = CSV_HEADERS.map((header) => `"${String(fields[header]).replaceAll('"', '""')}"`).join(',');
    expect(() => importCsv(`${CSV_HEADERS.join(',')}\n${row}`)).toThrow(expected);
  });

  it('rejects gaps and inconsistent metadata within a session', () => {
    const exported = exportCsv([session]);
    const rows = exported.split('\r\n');
    expect(() => importCsv([rows[0], rows[1], rows[3].replace('"3"', '"2"')].join('\n'))).not.toThrow();
    expect(() => importCsv([rows[0], rows[1], rows[3]].join('\n'))).toThrow(/consecutive starting at 1/);
    expect(() => importCsv([rows[0], rows[1], rows[2].replace('"60"', '"61"')].join('\n'))).toThrow(/weight does not match/);
  });
});

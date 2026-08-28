import type { Session, SetEntry } from './types';

export const CSV_HEADERS = [
  'session_id', 'exercise', 'started_at', 'completed_at', 'weight', 'unit', 'set_number',
  'reps', 'rir', 'rep_min', 'rep_max', 'rule', 'decision', 'next_weight'
] as const;

function safeCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCsv(sessions: Session[]): string {
  const rows = sessions.flatMap((session) => session.sets.map((set, index) => [
    session.id, session.exercise, session.startedAt, session.completedAt, session.weight, session.unit,
    index + 1, set.reps, set.rir, session.repMin, session.repMax, session.rule, session.decision, session.nextWeight
  ]));
  return [CSV_HEADERS.map(safeCell).join(','), ...rows.map((row) => row.map(safeCell).join(','))].join('\r\n');
}

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(value); value = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function finiteNumber(value: string, field: string, row: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Row ${row}: ${field} must be a number.`);
  return parsed;
}

export function importCsv(csv: string): Session[] {
  const rows = parseRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('The CSV has no session rows to import.');
  if (rows[0].join(',') !== CSV_HEADERS.join(',')) throw new Error('The CSV columns do not match a Rep Range Compass export.');

  const grouped = new Map<string, { session: Session; sets: Map<number, SetEntry> }>();
  rows.slice(1).forEach((cells, offset) => {
    const row = offset + 2;
    if (cells.length !== CSV_HEADERS.length) throw new Error(`Row ${row}: expected ${CSV_HEADERS.length} columns.`);
    const [id, exercise, startedAt, completedAt, weightText, unit, setText, repsText, rirText, minText, maxText, rule, decision, nextText] = cells;
    if (!id || !exercise || !Date.parse(startedAt) || !Date.parse(completedAt)) throw new Error(`Row ${row}: session identity or date is invalid.`);
    if (unit !== 'kg' && unit !== 'lb') throw new Error(`Row ${row}: unit must be kg or lb.`);
    if (rule !== 'all-top' && rule !== 'total-reps') throw new Error(`Row ${row}: progression rule is invalid.`);
    if (decision !== 'increase' && decision !== 'repeat') throw new Error(`Row ${row}: decision is invalid.`);
    const setNumber = finiteNumber(setText, 'set number', row);
    const entry: SetEntry = { reps: finiteNumber(repsText, 'reps', row), rir: finiteNumber(rirText, 'RIR', row), loggedAt: completedAt };
    const existing = grouped.get(id);
    const session: Session = existing?.session ?? {
      id, exercise, startedAt, completedAt, weight: finiteNumber(weightText, 'weight', row), unit,
      repMin: finiteNumber(minText, 'minimum reps', row), repMax: finiteNumber(maxText, 'maximum reps', row),
      rule, decision, nextWeight: finiteNumber(nextText, 'next weight', row), sets: []
    };
    const group = existing ?? { session, sets: new Map<number, SetEntry>() };
    if (group.sets.has(setNumber)) throw new Error(`Row ${row}: duplicate set ${setNumber} in session ${id}.`);
    group.sets.set(setNumber, entry);
    grouped.set(id, group);
  });
  return [...grouped.values()].map(({ session, sets }) => ({
    ...session,
    sets: [...sets.entries()].sort(([a], [b]) => a - b).map(([, set]) => set)
  }));
}

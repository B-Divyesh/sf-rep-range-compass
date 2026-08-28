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
  if (value.trim() === '') throw new Error(`Row ${row}: ${field} must be a number.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Row ${row}: ${field} must be a number.`);
  return parsed;
}

function boundedNumber(
  value: string,
  field: string,
  row: number,
  minimum: number,
  maximum: number,
  integer = false
): number {
  const parsed = finiteNumber(value, field, row);
  if (parsed < minimum || parsed > maximum || (integer && !Number.isInteger(parsed))) {
    const kind = integer ? 'whole number' : 'number';
    throw new Error(`Row ${row}: ${field} must be a ${kind} from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function weight(value: string, field: string, row: number, maximum: number): number {
  const parsed = boundedNumber(value, field, row, 0, maximum);
  if (Math.abs(parsed * 100 - Math.round(parsed * 100)) > 1e-8) {
    throw new Error(`Row ${row}: ${field} can have at most two decimal places.`);
  }
  return parsed;
}

function timestamp(value: string, field: string, row: number): number {
  const parsed = Date.parse(value);
  if (!value || !Number.isFinite(parsed)) throw new Error(`Row ${row}: ${field} must be a valid date and time.`);
  return parsed;
}

const sessionFields = [
  'exercise', 'started_at', 'completed_at', 'weight', 'unit', 'rep_min', 'rep_max', 'rule', 'decision', 'next_weight'
] as const;

interface ImportedGroup {
  session: Session;
  sets: Map<number, SetEntry>;
  source: Record<(typeof sessionFields)[number], string>;
}

export function importCsv(csv: string): Session[] {
  const rows = parseRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('The CSV has no session rows to import.');
  if (rows[0].join(',') !== CSV_HEADERS.join(',')) throw new Error('The CSV columns do not match a Rep Range Compass export.');

  const grouped = new Map<string, ImportedGroup>();
  rows.slice(1).forEach((cells, offset) => {
    const row = offset + 2;
    if (cells.length !== CSV_HEADERS.length) throw new Error(`Row ${row}: expected ${CSV_HEADERS.length} columns.`);
    const [id, exercise, startedAt, completedAt, weightText, unit, setText, repsText, rirText, minText, maxText, rule, decision, nextText] = cells;
    if (!id.trim() || id.length > 200) throw new Error(`Row ${row}: session ID must be between 1 and 200 characters.`);
    if (!exercise.trim() || exercise.length > 60) throw new Error(`Row ${row}: exercise must be between 1 and 60 characters.`);
    const startedTime = timestamp(startedAt, 'started at', row);
    const completedTime = timestamp(completedAt, 'completed at', row);
    if (completedTime < startedTime) throw new Error(`Row ${row}: completed at cannot be before started at.`);
    if (unit !== 'kg' && unit !== 'lb') throw new Error(`Row ${row}: unit must be kg or lb.`);
    if (rule !== 'all-top' && rule !== 'total-reps') throw new Error(`Row ${row}: progression rule is invalid.`);
    if (decision !== 'increase' && decision !== 'repeat') throw new Error(`Row ${row}: decision is invalid.`);
    const setNumber = boundedNumber(setText, 'set number', row, 1, 10, true);
    const reps = boundedNumber(repsText, 'reps', row, 0, 100, true);
    const rir = boundedNumber(rirText, 'RIR', row, 0, 10, true);
    const parsedWeight = weight(weightText, 'weight', row, 9999);
    const repMin = boundedNumber(minText, 'minimum reps', row, 1, 99, true);
    const repMax = boundedNumber(maxText, 'maximum reps', row, 2, 100, true);
    if (repMax <= repMin) throw new Error(`Row ${row}: maximum reps must be greater than minimum reps.`);
    const nextWeight = weight(nextText, 'next weight', row, 10998);
    if (decision === 'repeat' && nextWeight !== parsedWeight) throw new Error(`Row ${row}: a repeat decision must keep the same next weight.`);
    if (decision === 'increase' && nextWeight <= parsedWeight) throw new Error(`Row ${row}: an increase decision must raise the next weight.`);
    const entry: SetEntry = { reps, rir, loggedAt: completedAt };
    const source = {
      exercise, started_at: startedAt, completed_at: completedAt, weight: weightText, unit,
      rep_min: minText, rep_max: maxText, rule, decision, next_weight: nextText
    };
    const existing = grouped.get(id);
    const session: Session = existing?.session ?? {
      id, exercise, startedAt, completedAt, weight: parsedWeight, unit,
      repMin, repMax, rule, decision, nextWeight, sets: []
    };
    if (existing) {
      const changedField = sessionFields.find((field) => existing.source[field] !== source[field]);
      if (changedField) throw new Error(`Row ${row}: ${changedField.replaceAll('_', ' ')} does not match the other rows in session ${id}.`);
    }
    const group = existing ?? { session, sets: new Map<number, SetEntry>(), source };
    if (group.sets.has(setNumber)) throw new Error(`Row ${row}: duplicate set ${setNumber} in session ${id}.`);
    group.sets.set(setNumber, entry);
    grouped.set(id, group);
  });
  return [...grouped.values()].map(({ session, sets }) => {
    const ordered = [...sets.entries()].sort(([a], [b]) => a - b);
    const missingIndex = ordered.findIndex(([setNumber], index) => setNumber !== index + 1);
    if (missingIndex !== -1) throw new Error(`Session ${session.id}: set numbers must be consecutive starting at 1.`);
    if (session.rule === 'all-top' && session.decision === 'increase' && ordered.some(([, set]) => set.reps < session.repMax)) {
      throw new Error(`Session ${session.id}: an all-sets-top increase requires every set to reach ${session.repMax} reps.`);
    }
    return { ...session, sets: ordered.map(([, set]) => set) };
  });
}

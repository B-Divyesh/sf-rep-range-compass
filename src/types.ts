export type Rule = 'all-top' | 'total-reps';

export interface Settings {
  exercise: string;
  unit: 'kg' | 'lb';
  setCount: number;
  repMin: number;
  repMax: number;
  increment: number;
  startWeight: number;
  rule: Rule;
  totalTarget: number;
  rirFloor: number | null;
}

export interface SetEntry {
  reps: number;
  rir: number;
  loggedAt: string;
}

export interface DraftSession {
  id: string;
  startedAt: string;
  weight: number;
  sets: SetEntry[];
}

export interface Session extends DraftSession {
  completedAt: string;
  exercise: string;
  unit: 'kg' | 'lb';
  repMin: number;
  repMax: number;
  rule: Rule;
  decision: 'increase' | 'repeat';
  nextWeight: number;
}

export const defaultSettings: Settings = {
  exercise: 'Primary lift',
  unit: 'kg',
  setCount: 3,
  repMin: 8,
  repMax: 12,
  increment: 2.5,
  startWeight: 40,
  rule: 'all-top',
  totalTarget: 36,
  rirFloor: null
};

import type { DraftSession, Session, Settings } from './types';

export interface Decision {
  advance: boolean;
  nextWeight: number;
  reason: string;
}

export function roundWeight(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function decideProgression(settings: Settings, draft: DraftSession): Decision {
  if (draft.sets.length !== settings.setCount) {
    return { advance: false, nextWeight: draft.weight, reason: 'Complete every planned set first.' };
  }

  const repsPass = settings.rule === 'all-top'
    ? draft.sets.every((set) => set.reps >= settings.repMax)
    : draft.sets.reduce((sum, set) => sum + set.reps, 0) >= settings.totalTarget;
  const rirPass = settings.rirFloor === null || draft.sets.every((set) => set.rir >= settings.rirFloor!);
  const advance = repsPass && rirPass;

  if (!repsPass) {
    const reason = settings.rule === 'all-top'
      ? `At least one set was below ${settings.repMax} reps.`
      : `The session total was below ${settings.totalTarget} reps.`;
    return { advance, nextWeight: draft.weight, reason };
  }
  if (!rirPass) {
    return { advance, nextWeight: draft.weight, reason: `At least one set was below ${settings.rirFloor} RIR.` };
  }
  return {
    advance,
    nextWeight: roundWeight(draft.weight + settings.increment),
    reason: settings.rule === 'all-top'
      ? `Every set reached ${settings.repMax} reps${settings.rirFloor === null ? '' : ` at ${settings.rirFloor}+ RIR`}.`
      : `You reached the ${settings.totalTarget}-rep session target.`
  };
}

export function completeSession(settings: Settings, draft: DraftSession, completedAt: string): Session {
  const decision = decideProgression(settings, draft);
  return {
    ...draft,
    completedAt,
    exercise: settings.exercise,
    unit: settings.unit,
    repMin: settings.repMin,
    repMax: settings.repMax,
    rule: settings.rule,
    decision: decision.advance ? 'increase' : 'repeat',
    nextWeight: decision.nextWeight
  };
}

export function suggestedWeight(settings: Settings, sessions: Session[]): number {
  return sessions[0]?.nextWeight ?? settings.startWeight;
}

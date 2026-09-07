export type ClipScores = {
  hook: number;
  clarity: number;
  payoff: number;
  emotion: number;
  novelty: number;
  cleanCut: number;
};

export type ClipCandidate = {
  startMs: number;
  endMs: number;
  title: string;
  openingHook?: string;
  reason?: string;
  scores: ClipScores;
};

function bounded(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clipPotential(scores: ClipScores) {
  return Math.round(
    bounded(scores.hook) * 0.30 +
    bounded(scores.clarity) * 0.20 +
    bounded(scores.payoff) * 0.20 +
    bounded(scores.emotion) * 0.10 +
    bounded(scores.novelty) * 0.10 +
    bounded(scores.cleanCut) * 0.10
  );
}

export function overlapRatio(a: ClipCandidate, b: ClipCandidate) {
  const intersection = Math.max(0, Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs));
  const shortest = Math.min(a.endMs - a.startMs, b.endMs - b.startMs);
  return shortest > 0 ? intersection / shortest : 0;
}

export function selectCandidates(candidates: ClipCandidate[], requested: number, sourceDurationMs: number) {
  if (requested < 1) throw new Error("At least one clip must be requested.");
  const valid = candidates
    .filter((candidate) => candidate.startMs >= 0 && candidate.endMs > candidate.startMs && candidate.endMs <= sourceDurationMs)
    .sort((a, b) => clipPotential(b.scores) - clipPotential(a.scores));

  const selected: ClipCandidate[] = [];
  for (const candidate of valid) {
    if (!selected.some((existing) => overlapRatio(candidate, existing) > 0.60)) selected.push(candidate);
    if (selected.length >= requested) break;
  }
  return selected;
}

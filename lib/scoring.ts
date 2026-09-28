import { recommendationFromPercentage } from "@/lib/rubrics";
import type { ScoreCriterion } from "@/types";

export function computeTotals(scores: ScoreCriterion[]) {
  const total_score = round1(scores.reduce((sum, s) => sum + s.score, 0));
  const max_score = scores.reduce((sum, s) => sum + s.max_score, 0);
  const percentage = max_score > 0 ? round1((total_score / max_score) * 100) : 0;
  const recommendation = recommendationFromPercentage(percentage);
  return { total_score, max_score, percentage, recommendation };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

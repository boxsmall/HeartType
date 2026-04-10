import { DIMENSION_WEIGHTS } from './constants';
import { AnswerInput, Dimension, DimensionLevel, DimensionScoreMap, QuestionWeight } from './types';

export function createEmptyDimensionScores(): DimensionScoreMap {
  return {
    S: 0,
    E: 0,
    A: 0,
    R: 0,
    C: 0,
    F: 0,
    M: 0,
    L: 0,
    X: 0,
    D: 0,
  };
}

export function calculateDimensionScores(answers: AnswerInput[], questionWeights: QuestionWeight[]): DimensionScoreMap {
  const scores = createEmptyDimensionScores();
  const weightByQuestionId = new Map<number, QuestionWeight>();

  for (const q of questionWeights) {
    weightByQuestionId.set(q.questionId, q);
  }

  for (const item of answers) {
    const q = weightByQuestionId.get(item.questionId);
    if (!q) continue;
    scores[q.dimension] += q.weights[item.answer];
  }

  return scores;
}

export function toDimensionLevel(score: number): DimensionLevel {
  if (score <= 8) return 'L';
  if (score <= 11) return 'M';
  return 'H';
}

export function toDimensionLevels(scores: DimensionScoreMap): Record<Dimension, DimensionLevel> {
  return {
    S: toDimensionLevel(scores.S),
    E: toDimensionLevel(scores.E),
    A: toDimensionLevel(scores.A),
    R: toDimensionLevel(scores.R),
    C: toDimensionLevel(scores.C),
    F: toDimensionLevel(scores.F),
    M: toDimensionLevel(scores.M),
    L: toDimensionLevel(scores.L),
    X: toDimensionLevel(scores.X),
    D: toDimensionLevel(scores.D),
  };
}

export function calculateBaseMatchScore(a: DimensionScoreMap, b: DimensionScoreMap): number {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const [dimension, weight] of Object.entries(DIMENSION_WEIGHTS) as Array<[Dimension, number]>) {
    const similarity = 10 - Math.abs(a[dimension] - b[dimension]);
    weightedScore += similarity * weight;
    totalWeight += weight;
  }

  return Math.round((weightedScore / totalWeight) * 10);
}

export function clampToPercentage(v: number): number {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

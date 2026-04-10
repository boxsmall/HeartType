import { Dimension, QuestionWeight } from './types';

export const PERSON_TYPES = [
  'ATM-er', 'LOVER', 'MUM', 'MALO',
  'JOKE-R', 'DIORS', 'SEXY', 'OJBK', 'THAN-K',
  'THIN-K', 'NSDD', 'CTRL', 'SOLO', 'NTR', 'GAY/Les',
  'MONK', 'GOGO', 'WOC', 'DEAD', 'WEAK',
  'SHIT', 'IMSB', 'FAKE', 'BOSS',
] as const;

export type PersonType = (typeof PERSON_TYPES)[number];

export const TOTAL_QUESTIONS = 50;

// D维度（Q46-Q50）反向计分：A=3, B=2, C=1
export const D_REVERSE_QUESTION_IDS = [46, 47, 48, 49, 50] as const;

export const DIMENSION_ORDER: readonly Dimension[] = ['S', 'E', 'A', 'R', 'C', 'F', 'M', 'L', 'X', 'D'] as const;

export const DIMENSION_WEIGHTS = {
  E: 1.5,
  R: 1.5,
  F: 1.3,
  C: 1.2,
  D: 1.2,
  S: 1.0,
  A: 1.0,
  M: 1.0,
  L: 1.0,
  X: 1.0,
} as const;

export function buildDefaultQuestionWeights(): QuestionWeight[] {
  const result: QuestionWeight[] = [];

  for (let q = 1; q <= TOTAL_QUESTIONS; q += 1) {
    const dimIndex = Math.floor((q - 1) / 5);
    const dimension = DIMENSION_ORDER[dimIndex];

    const isDReverse = D_REVERSE_QUESTION_IDS.includes(q as (typeof D_REVERSE_QUESTION_IDS)[number]);
    const weights = isDReverse
      ? { A: 3, B: 2, C: 1 }
      : { A: 1, B: 2, C: 3 };

    result.push({
      questionId: q,
      dimension,
      weights,
    });
  }

  return result;
}

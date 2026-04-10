export const DIMENSIONS = ['S', 'E', 'A', 'R', 'C', 'F', 'M', 'L', 'X', 'D'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const OPTIONS = ['A', 'B', 'C'] as const;
export type AnswerOption = (typeof OPTIONS)[number];

export type DimensionScoreMap = Record<Dimension, number>;
export type DimensionLevel = 'L' | 'M' | 'H';

export interface AnswerInput {
  questionId: number;
  answer: AnswerOption;
}

export interface QuestionWeight {
  questionId: number;
  dimension: Dimension;
  weights: Record<AnswerOption, number>;
}

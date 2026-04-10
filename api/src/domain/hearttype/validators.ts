import { PERSON_TYPES, TOTAL_QUESTIONS } from './constants';
import { AnswerInput, AnswerOption, OPTIONS } from './types';

function isAnswerOption(v: string): v is AnswerOption {
  return (OPTIONS as readonly string[]).includes(v);
}

export function isPersonType(value: string): boolean {
  return (PERSON_TYPES as readonly string[]).includes(value);
}

export function validateAnswers(answers: AnswerInput[]): string[] {
  const errors: string[] = [];

  if (answers.length !== TOTAL_QUESTIONS) {
    errors.push(`answers length must be ${TOTAL_QUESTIONS}`);
    return errors;
  }

  const questionIdSet = new Set<number>();

  for (const item of answers) {
    if (!Number.isInteger(item.questionId) || item.questionId < 1 || item.questionId > TOTAL_QUESTIONS) {
      errors.push(`invalid questionId: ${item.questionId}`);
      continue;
    }

    if (questionIdSet.has(item.questionId)) {
      errors.push(`duplicate questionId: ${item.questionId}`);
    }
    questionIdSet.add(item.questionId);

    if (!isAnswerOption(item.answer)) {
      errors.push(`invalid answer option for question ${item.questionId}: ${String(item.answer)}`);
    }
  }

  for (let q = 1; q <= TOTAL_QUESTIONS; q += 1) {
    if (!questionIdSet.has(q)) {
      errors.push(`missing questionId: ${q}`);
    }
  }

  return errors;
}

export function assertValidAnswers(answers: AnswerInput[]): void {
  const errors = validateAnswers(answers);
  if (errors.length > 0) {
    throw new Error(`Invalid answers: ${errors.join('; ')}`);
  }
}

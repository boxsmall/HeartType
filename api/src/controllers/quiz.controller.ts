import type { Request, Response } from 'express';
import {
  buildDefaultQuestionWeights,
  calculateDimensionScores,
  determinePersonType,
  deriveGrade,
  validateAnswers,
} from '../domain/hearttype';
import type { AnswerInput } from '../domain/hearttype';
import { saveResult } from './hearttype-demo-store';

const QUESTION_WEIGHTS = buildDefaultQuestionWeights();

function getDefaultTags(type: string): string[] {
  const tags: Record<string, string[]> = {
    'ATM-er': ['安全感顶配', '资源型伴侣'],
    'LOVER': ['情绪价值爆炸', '无脑偏爱'],
    'MUM': ['情绪兜底王', '治愈型'],
    'MALO': ['灵魂同类', '快乐放大器'],
  };
  return tags[type] ?? ['真实系', '可成长'];
}

function getShortDesc(type: string): string {
  const map: Record<string, string> = {
    'ATM-er': '有实力也愿意投入，给足安全感',
    'LOVER': '情感浓度很高，偏爱感拉满',
    'MUM': '稳定包容，擅长接住情绪',
    'MALO': '相处轻松，快乐值很高',
  };
  return map[type] ?? '你的恋爱人格有清晰特征，建议查看完整分析';
}

type SubmitQuizBody = {
  answers?: AnswerInput[];
};

export function submitQuiz(req: Request<unknown, unknown, SubmitQuizBody>, res: Response): void {
  const answers = req.body?.answers ?? [];
  const errors = validateAnswers(answers);
  if (errors.length > 0) {
    res.status(400).json({
      code: 400,
      message: '请求参数错误',
      error: {
        type: 'VALIDATION_ERROR',
        details: errors,
      },
    });
    return;
  }

  const dims = calculateDimensionScores(answers, QUESTION_WEIGHTS);
  const personType = determinePersonType(dims);
  const grade = deriveGrade(dims);

  const row = saveResult({
    personType,
    grade,
    dims,
  });

  res.json({
    code: 200,
    message: 'success',
    data: {
      result_id: row.id,
      person_type: row.personType,
      grade: row.grade,
      dims: row.dims,
      tags: getDefaultTags(row.personType),
      short_desc: getShortDesc(row.personType),
      created_at: row.createdAt,
    },
  });
}

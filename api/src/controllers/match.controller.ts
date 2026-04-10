import type { Request, Response } from 'express';
import {
  DIMENSION_ORDER,
  PERSON_TYPES,
  applyChemistry,
  calculateBaseMatchScore,
  determinePersonType,
  describeMatchType,
} from '../domain/hearttype';
import type { Dimension, DimensionScoreMap, PersonType } from '../domain/hearttype';
import { getResultById, nextMatchId } from './hearttype-demo-store';

type CalculateMatchBody = {
  result_a_id?: number;
  result_b_id?: number;
};

type CalculateCompatibilityBody = {
  type_a?: string;
  type_b?: string;
  dims_a?: Partial<Record<Dimension, number>>;
};

const DEFAULT_DIM_SCORE = 10;

function buildDefaultDims(): DimensionScoreMap {
  return {
    S: DEFAULT_DIM_SCORE,
    E: DEFAULT_DIM_SCORE,
    A: DEFAULT_DIM_SCORE,
    R: DEFAULT_DIM_SCORE,
    C: DEFAULT_DIM_SCORE,
    F: DEFAULT_DIM_SCORE,
    M: DEFAULT_DIM_SCORE,
    L: DEFAULT_DIM_SCORE,
    X: DEFAULT_DIM_SCORE,
    D: DEFAULT_DIM_SCORE,
  };
}

function isPersonType(type: string): type is PersonType {
  return (PERSON_TYPES as readonly string[]).includes(type);
}

function normalizeDims(raw?: Partial<Record<Dimension, number>>): DimensionScoreMap {
  const dims = buildDefaultDims();
  if (!raw) return dims;

  for (const dim of DIMENSION_ORDER) {
    const val = Number(raw[dim]);
    if (Number.isFinite(val)) {
      dims[dim] = Math.min(15, Math.max(5, Math.round(val)));
    }
  }
  return dims;
}

function buildFallbackTypeDims(type: PersonType): DimensionScoreMap {
  const dims = buildDefaultDims();
  if (type === 'GAY/Les') {
    dims.E = 12;
    dims.X = 12;
    dims.F = 9;
    return dims;
  }
  const base = Array.from(type).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  DIMENSION_ORDER.forEach((dim, idx) => {
    dims[dim] = 8 + ((base + idx * 7) % 5);
  });
  return dims;
}

function buildTypePrototypeDims(type: PersonType): DimensionScoreMap {
  if (type === 'GAY/Les') return buildFallbackTypeDims(type);

  const base = Array.from(type).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  for (let i = 0; i < 4000; i += 1) {
    const candidate = buildDefaultDims();
    DIMENSION_ORDER.forEach((dim, idx) => {
      candidate[dim] = 5 + ((base + i * 17 + idx * 11) % 11);
    });
    if (determinePersonType(candidate) === type) return candidate;
  }
  return buildFallbackTypeDims(type);
}

function topDimensionsByGap(a: DimensionScoreMap, b: DimensionScoreMap): Array<{ dim: Dimension; gap: number }> {
  const dims: Dimension[] = ['S', 'E', 'A', 'R', 'C', 'F', 'M', 'L', 'X', 'D'];
  return dims
    .map((dim) => ({ dim, gap: Math.abs(a[dim] - b[dim]) }))
    .sort((x, y) => y.gap - x.gap);
}

function buildAnalysis(a: DimensionScoreMap, b: DimensionScoreMap): { pros: string[]; risks: string[]; suggestions: string[] } {
  const sorted = topDimensionsByGap(a, b);
  const highGap = sorted.slice(0, 2);
  const lowGap = [...sorted].reverse().slice(0, 2);

  return {
    pros: [
      `你们在 ${lowGap[0].dim} 维度差距较小，互动节奏更容易同步`,
      `你们在 ${lowGap[1].dim} 维度更接近，冲突成本相对较低`,
    ],
    risks: [
      `${highGap[0].dim} 维度差异较大，容易在该议题上拉扯`,
      `${highGap[1].dim} 维度差异明显，建议先对齐边界和预期`,
    ],
    suggestions: [
      `围绕 ${highGap[0].dim}/${highGap[1].dim} 建立固定沟通机制`,
      '先确认彼此底线，再讨论改进方式，避免情绪化升级',
    ],
  };
}

export function calculateMatch(req: Request<unknown, unknown, CalculateMatchBody>, res: Response): void {
  const resultAId = req.body?.result_a_id;
  const resultBId = req.body?.result_b_id;

  if (!Number.isInteger(resultAId) || !Number.isInteger(resultBId)) {
    res.status(400).json({
      code: 400,
      message: '请求参数错误',
      error: {
        type: 'VALIDATION_ERROR',
        details: ['result_a_id and result_b_id must be integer'],
      },
    });
    return;
  }

  const resultAIdNum = Number(resultAId);
  const resultBIdNum = Number(resultBId);

  const resultA = getResultById(resultAIdNum);
  const resultB = getResultById(resultBIdNum);
  if (!resultA || !resultB) {
    res.status(404).json({
      code: 404,
      message: '资源不存在',
      error: {
        type: 'NOT_FOUND',
        details: ['result not found'],
      },
    });
    return;
  }

  const baseScore = calculateBaseMatchScore(resultA.dims, resultB.dims);
  const finalScore = applyChemistry(baseScore, resultA.personType, resultB.personType);
  const { matchType, description } = describeMatchType(finalScore);
  const analysis = buildAnalysis(resultA.dims, resultB.dims);

  res.json({
    code: 200,
    message: 'success',
    data: {
      match_id: nextMatchId(),
      score: finalScore,
      match_type: matchType,
      type_description: description,
      analysis,
      base_score: baseScore,
      type_a: resultA.personType,
      type_b: resultB.personType,
    },
  });
}

export function calculateCompatibility(req: Request<unknown, unknown, CalculateCompatibilityBody>, res: Response): void {
  const typeA = String(req.body?.type_a ?? '');
  const typeB = String(req.body?.type_b ?? '');

  if (!isPersonType(typeA) || !isPersonType(typeB)) {
    res.status(400).json({
      code: 400,
      message: '请求参数错误',
      error: {
        type: 'VALIDATION_ERROR',
        details: ['type_a and type_b must be valid person types'],
      },
    });
    return;
  }

  const dimsA = normalizeDims(req.body?.dims_a);
  const dimsB = buildTypePrototypeDims(typeB);

  const baseScore = calculateBaseMatchScore(dimsA, dimsB);
  const finalScore = applyChemistry(baseScore, typeA, typeB);
  const { matchType, description } = describeMatchType(finalScore);
  const analysis = buildAnalysis(dimsA, dimsB);

  res.json({
    code: 200,
    message: 'success',
    data: {
      match_id: nextMatchId(),
      score: finalScore,
      match_type: matchType,
      type_description: description,
      analysis,
      base_score: baseScore,
      type_a: typeA,
      type_b: typeB,
    },
  });
}

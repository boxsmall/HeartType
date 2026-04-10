import { PERSON_TYPES } from './constants';
import type { PersonType } from './constants';
import { Dimension, DimensionLevel, DimensionScoreMap } from './types';
import { clampToPercentage, toDimensionLevels } from './scoring';

type ConditionValue = DimensionLevel | '≤M' | '≥M' | '<M' | '>M';
type Rule = {
  code: PersonType;
  priority: number;
  conditions: Partial<Record<Dimension, ConditionValue>>;
};

const RULES: Rule[] = [
  { code: 'SHIT', priority: 1, conditions: { A: 'L', F: 'L', X: '≤M' } },
  { code: 'DEAD', priority: 2, conditions: { E: 'L', F: 'L', R: 'L' } },
  { code: 'FAKE', priority: 3, conditions: { S: 'M', E: 'L', X: 'H' } },
  { code: 'BOSS', priority: 4, conditions: { C: 'H', M: 'H', D: 'L' } },

  { code: 'CTRL', priority: 10, conditions: { C: 'H', M: 'H', F: '≤M' } },
  { code: 'SOLO', priority: 11, conditions: { D: 'H', E: '≤M', X: '≤M' } },
  { code: 'MONK', priority: 12, conditions: { F: 'H', E: 'L', C: 'L' } },

  { code: 'ATM-er', priority: 20, conditions: { E: 'H', R: 'H', M: 'H', C: '≤M' } },
  { code: 'LOVER', priority: 21, conditions: { E: 'H', D: 'H', F: '≤M' } },
  { code: 'MUM', priority: 22, conditions: { R: 'H', F: 'H', E: '≥M' } },
  { code: 'MALO', priority: 23, conditions: { L: 'H', X: 'H', M: '≤M' } },

  { code: 'THIN-K', priority: 30, conditions: { A: 'H', F: 'H', X: '≤M' } },
  { code: 'NSDD', priority: 31, conditions: { M: 'L', L: 'H' } },
  { code: 'NTR', priority: 32, conditions: { E: '≥M', F: 'M', D: '≥M' } },
  { code: 'GOGO', priority: 33, conditions: { E: 'L', X: '≥M', C: 'L' } },
  { code: 'WOC', priority: 34, conditions: { F: 'L', E: '≥M' } },
  { code: 'WEAK', priority: 35, conditions: { D: 'H', F: 'L', S: '≥M' } },
  { code: 'IMSB', priority: 36, conditions: { A: 'H', C: 'H', X: 'H' } },
  { code: 'SEXY', priority: 37, conditions: { X: 'H', E: 'H', S: 'H' } },
  { code: 'OJBK', priority: 38, conditions: { F: 'H', C: '≤M', D: '≤M' } },
  { code: 'THAN-K', priority: 39, conditions: { R: 'H', E: '≥M', M: '≥M' } },
  { code: 'JOKE-R', priority: 40, conditions: { X: 'H', L: 'H', F: 'M' } },
  { code: 'DIORS', priority: 41, conditions: { M: '≤M', S: '≤M', L: 'H' } },
];

function matchExpected(actual: DimensionLevel, expected: ConditionValue): boolean {
  if (expected === actual) return true;
  if (expected === '≤M') return actual === 'L' || actual === 'M';
  if (expected === '≥M') return actual === 'M' || actual === 'H';
  if (expected === '<M') return actual === 'L';
  if (expected === '>M') return actual === 'H';
  return false;
}

function matchRule(levels: Record<Dimension, DimensionLevel>, rule: Rule): boolean {
  for (const [dim, expected] of Object.entries(rule.conditions) as Array<[Dimension, ConditionValue]>) {
    if (!matchExpected(levels[dim], expected)) return false;
  }
  return true;
}

export function determinePersonType(scores: DimensionScoreMap): PersonType {
  const levels = toDimensionLevels(scores);
  const sorted = [...RULES].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (matchRule(levels, rule)) return rule.code;
  }

  if (levels.R === 'H' && levels.F === 'H') return 'THAN-K';
  if (levels.X === 'H' && levels.L === 'H') return 'MALO';
  return 'DIORS';
}

export function deriveGrade(scores: DimensionScoreMap): 'S' | 'A' | 'B' | 'C' | 'D' {
  const levels = toDimensionLevels(scores);
  const core = [levels.E, levels.R, levels.F];
  const highCount = core.filter((x) => x === 'H').length;
  const lowCount = core.filter((x) => x === 'L').length;

  if (highCount === 3) return 'S';
  if (highCount === 2) return 'A';
  if (highCount === 1) return 'B';
  if (lowCount >= 2) return 'D';
  return 'C';
}

type ChemistryRule = { a: PersonType; b: PersonType | 'ANY'; delta: number };

const CHEMISTRY: ChemistryRule[] = [
  { a: 'ATM-er', b: 'LOVER', delta: 15 },
  { a: 'MUM', b: 'SOLO', delta: 12 },
  { a: 'JOKE-R', b: 'MALO', delta: 10 },
  { a: 'THAN-K', b: 'OJBK', delta: 10 },
  { a: 'ATM-er', b: 'MUM', delta: 10 },
  { a: 'LOVER', b: 'SEXY', delta: 10 },
  { a: 'MALO', b: 'DIORS', delta: 8 },
  { a: 'JOKE-R', b: 'OJBK', delta: 8 },
  { a: 'CTRL', b: 'LOVER', delta: -10 },
  { a: 'BOSS', b: 'LOVER', delta: -20 },
  { a: 'SHIT', b: 'ANY', delta: -25 },
  { a: 'FAKE', b: 'ANY', delta: -20 },
  { a: 'DEAD', b: 'LOVER', delta: -15 },
  { a: 'MONK', b: 'LOVER', delta: -15 },
  { a: 'WOC', b: 'WOC', delta: -20 },
  { a: 'IMSB', b: 'ANY', delta: -15 },
  { a: 'BOSS', b: 'CTRL', delta: -20 },
];

export function applyChemistry(baseScore: number, typeA: PersonType, typeB: PersonType): number {
  let score = baseScore;
  for (const rule of CHEMISTRY) {
    const direct = rule.a === typeA && (rule.b === typeB || rule.b === 'ANY');
    const reverse = rule.a === typeB && (rule.b === typeA || rule.b === 'ANY');
    if (direct || reverse) score += rule.delta;
  }
  return clampToPercentage(score);
}

export function describeMatchType(score: number): { matchType: string; description: string } {
  if (score >= 90) return { matchType: '灵魂伴侣', description: '你们属于天选组合' };
  if (score >= 75) return { matchType: '高质量恋爱', description: '只要经营，基本稳' };
  if (score >= 60) return { matchType: '可发展关系', description: '有吸引，也有摩擦' };
  if (score >= 40) return { matchType: '高磨合关系', description: '需要大量沟通' };
  return { matchType: '不建议', description: '容易消耗甚至伤害' };
}

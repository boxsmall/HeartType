import type { DimensionScoreMap, PersonType } from '../domain/hearttype';

export type StoredResult = {
  id: number;
  personType: PersonType;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  dims: DimensionScoreMap;
  createdAt: string;
};

const results = new Map<number, StoredResult>();
let resultIdSeq = 2000;
let matchIdSeq = 3000;

export function saveResult(input: Omit<StoredResult, 'id' | 'createdAt'>): StoredResult {
  resultIdSeq += 1;
  const row: StoredResult = {
    id: resultIdSeq,
    personType: input.personType,
    grade: input.grade,
    dims: input.dims,
    createdAt: new Date().toISOString(),
  };
  results.set(row.id, row);
  return row;
}

export function getResultById(id: number): StoredResult | undefined {
  return results.get(id);
}

export function nextMatchId(): number {
  matchIdSeq += 1;
  return matchIdSeq;
}

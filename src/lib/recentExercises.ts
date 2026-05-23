import type { CheckResult, Exercise } from './types';

const STORAGE_KEY = 'italian-practice:recent-exercises';
const MAX_RECENT = 12;

export interface RecentExercise {
  exercise: Exercise;
  answer: string;
  result: CheckResult;
  checkedAt: string;
}

export function loadRecentExercises(): RecentExercise[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentExercise[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentExercise(item: RecentExercise): RecentExercise[] {
  if (typeof localStorage === 'undefined') return [];

  const next = [item, ...loadRecentExercises()].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

import type { CheckResult, Exercise, ExerciseGroup } from './types';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      },
      ...init
    });
  } catch {
    throw new ApiError(
      'You appear to be offline or the backend is unreachable. The app shell still works, but new exercises require internet access.',
      0
    );
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : undefined;
    throw new ApiError(detail ?? `Request failed with status ${response.status}`, response.status, detail);
  }

  return data as T;
}

export function getHealth(): Promise<{ status: string }> {
  return request('/health');
}

export function getExerciseGroups(): Promise<ExerciseGroup[]> {
  return request('/exercise-groups');
}

export function generateExercise(groupId: string): Promise<Exercise> {
  return request('/exercises/generate', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId })
  });
}

export function checkExercise(exerciseId: string, answer: string): Promise<CheckResult> {
  return request('/exercises/check', {
    method: 'POST',
    body: JSON.stringify({ exercise_id: exerciseId, answer })
  });
}

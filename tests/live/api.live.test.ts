import { describe, expect, it } from 'vitest';

const LIVE_API_BASE_URL = 'https://italian-app-txy6.onrender.com';
const VALID_ANSWER_FORMATS = ['whole_sentence', 'only_words', 'only_preposition'];

async function requestWithRetry<T>(path: string, init?: RequestInit, expectedStatus = 200): Promise<T> {
  const attempts = 5;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${LIVE_API_BASE_URL}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers
        },
        ...init
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (response.status !== expectedStatus) {
        throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      return data as T;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 15000));
      }
    }
  }

  throw lastError;
}

describe('live Italian grammar API', () => {
  it('passes the health check', async () => {
    const health = await requestWithRetry<{ status: string }>('/health');

    expect(health.status).toBe('ok');
  });

  it('fetches exercise groups', async () => {
    const groups = await requestWithRetry<Array<{ id: string; title: string; description: string }>>('/exercise-groups');

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.map((group) => group.id)).toEqual(expect.arrayContaining(['preposizione']));
    expect(groups[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String)
      })
    );
  });

  it('generates an exercise for every returned group', async () => {
    const groups = await requestWithRetry<Array<{ id: string; title: string }>>('/exercise-groups');

    for (const group of groups) {
      const exercise = await requestWithRetry<{
        exercise_id: string;
        group_id: string;
        title: string;
        description: string;
        query: string;
        answer_format: string;
      }>('/exercises/generate', {
        method: 'POST',
        body: JSON.stringify({ group_id: group.id, seed: 123 })
      });

      expect(exercise.exercise_id, group.id).toEqual(expect.any(String));
      expect(exercise.group_id).toBe(group.id);
      expect(exercise.title).toEqual(expect.any(String));
      expect(exercise.description).toEqual(expect.any(String));
      expect(exercise.query).toEqual(expect.any(String));
      expect(VALID_ANSWER_FORMATS).toContain(exercise.answer_format);
    }
  });

  it('generates and checks one exercise with expected answer feedback', async () => {
    const groups = await requestWithRetry<Array<{ id: string }>>('/exercise-groups');
    const exercise = await requestWithRetry<{
      exercise_id: string;
      query: string;
      answer_format: string;
    }>('/exercises/generate', {
      method: 'POST',
      body: JSON.stringify({ group_id: groups[0].id, seed: 123 })
    });

    const result = await requestWithRetry<{ correct: boolean; expected_answers: string[] }>('/exercises/check', {
      method: 'POST',
      body: JSON.stringify({ exercise_id: exercise.exercise_id, answer: '__live_test_placeholder__' })
    });

    expect(exercise.exercise_id).toEqual(expect.any(String));
    expect(exercise.query).toEqual(expect.any(String));
    expect(exercise.answer_format).toEqual(expect.any(String));
    expect(result.correct).toEqual(expect.any(Boolean));
    expect(result.expected_answers.length).toBeGreaterThan(0);
  });

  it('returns a clear error for an unknown exercise group', async () => {
    const result = await requestWithRetry<{ detail: string }>(
      '/exercises/generate',
      {
        method: 'POST',
        body: JSON.stringify({ group_id: '__unknown_live_test_group__' })
      },
      404
    );

    expect(result.detail).toMatch(/unknown exercise group/i);
  });
});

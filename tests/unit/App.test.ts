import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';

const groups = [
  {
    id: 'pronome_diretto_presente',
    title: 'Pronome Diretto PRESENTE',
    description: 'Write the whole sentence.'
  },
  {
    id: 'preposizione',
    title: 'Preposizione',
    description: 'Answer with only the preposition.'
  }
];

const firstExercise = {
  exercise_id: 'exercise-1',
  group_id: 'pronome_diretto_presente',
  title: 'Pronome Diretto PRESENTE',
  description: 'Write the whole sentence.',
  query: 'Io (inviare PRESENTE) un messaggio a te',
  answer_format: 'whole_sentence' as const
};

const secondExercise = {
  exercise_id: 'exercise-2',
  group_id: 'preposizione',
  title: 'Preposizione',
  description: 'Answer with only the preposition.',
  query: 'Vado ___ Roma',
  answer_format: 'only_preposition' as const
};

const correctResult = {
  correct: true,
  expected_answers: ['Te lo invio'],
  normalized_answer: 'te lo invio',
  hint: null
};

let generateQueue: unknown[];
let checkQueue: unknown[];
let generatedGroupIds: string[];
let checkedAnswers: Array<{ exercise_id: string; answer: string }>;

beforeEach(() => {
  localStorage.clear();
  generateQueue = [firstExercise];
  checkQueue = [correctResult];
  generatedGroupIds = [];
  checkedAnswers = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).replace('http://127.0.0.1:8000', '');

      if (path === '/exercise-groups') {
        return jsonResponse(groups);
      }

      if (path === '/exercises/generate') {
        const body = JSON.parse(String(init?.body));
        generatedGroupIds.push(body.group_id);
        return jsonResponse(generateQueue.shift() ?? firstExercise);
      }

      if (path === '/exercises/check') {
        const body = JSON.parse(String(init?.body));
        checkedAnswers.push(body);
        return jsonResponse(checkQueue.shift() ?? correctResult);
      }

      return jsonResponse({ detail: 'Not found' }, 404);
    })
  );
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('App', () => {
  it('loads and renders the selection screen from API groups', async () => {
    render(App);

    expect(await screen.findByText('Pronome Diretto PRESENTE')).toBeInTheDocument();
    expect(screen.getByText('Preposizione')).toBeInTheDocument();
    expect(screen.getByLabelText(/Pronome Diretto PRESENTE/)).toBeChecked();
    expect(screen.getByLabelText(/Preposizione/)).toBeChecked();
    expect(screen.getByLabelText('30')).toBeChecked();
    expect(screen.getByLabelText('10')).toBeInTheDocument();
    expect(screen.getByLabelText('30')).toBeInTheDocument();
    expect(screen.getByLabelText('100')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/exercise-groups',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
  });

  it('can unselect all exercise groups', async () => {
    const user = userEvent.setup();
    render(App);

    expect(await screen.findByLabelText(/Pronome Diretto PRESENTE/)).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Unselect all' }));

    expect(screen.getByLabelText(/Pronome Diretto PRESENTE/)).not.toBeChecked();
    expect(screen.getByLabelText(/Preposizione/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Start session' })).toBeDisabled();
  });

  it('starts a session and generates an exercise for the selected group', async () => {
    const user = userEvent.setup();
    render(App);

    await screen.findByLabelText(/Pronome Diretto PRESENTE/);
    await user.click(screen.getByRole('button', { name: 'Start session' }));

    expect(await screen.findByText('Io (inviare PRESENTE) un messaggio a te')).toBeInTheDocument();
    expect(screen.getByText('Question 1 / 30')).toBeInTheDocument();
    expect(screen.getByText('Write the complete Italian sentence.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Answer')).toHaveFocus());
    expect(generatedGroupIds).toEqual(['pronome_diretto_presente']);
  });

  it('renders an exercise and submits an answer', async () => {
    const user = userEvent.setup();
    render(App);

    await screen.findByLabelText(/Pronome Diretto PRESENTE/);
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    await user.type(await screen.findByLabelText('Answer'), 'Te lo invio');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));

    expect(await screen.findByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Expected: Te lo invio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(checkedAnswers).toEqual([{ exercise_id: 'exercise-1', answer: 'Te lo invio' }]);
  });

  it('checks with Enter and advances with another Enter', async () => {
    generateQueue = [firstExercise, secondExercise];

    const user = userEvent.setup();
    render(App);

    await screen.findByLabelText(/Pronome Diretto PRESENTE/);
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    await user.type(await screen.findByLabelText('Answer'), 'Te lo invio{Enter}');

    expect(await screen.findByText('Correct')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus());
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Vado ___ Roma')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Answer')).toHaveFocus());
    expect(generatedGroupIds).toEqual(['pronome_diretto_presente', 'preposizione']);
  });

  it('shows incorrect feedback with expected answers and hint', async () => {
    checkQueue = [
      {
        correct: false,
        expected_answers: ["Te l'ho inviata"],
        normalized_answer: 'te lho inviata',
        hint: 'Check the apostrophe.'
      }
    ];

    const user = userEvent.setup();
    render(App);

    await screen.findByLabelText(/Pronome Diretto PRESENTE/);
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    await user.type(await screen.findByLabelText('Answer'), 'Te lho inviata');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));

    expect(await screen.findByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText("Expected: Te l'ho inviata")).toBeInTheDocument();
    expect(screen.getByText('Hint: Check the apostrophe.')).toBeInTheDocument();
  });

  it('keeps generating exercises in infinite mode until stopped', async () => {
    generateQueue = [firstExercise, secondExercise];

    const user = userEvent.setup();
    render(App);

    await screen.findByLabelText(/Pronome Diretto PRESENTE/);
    await user.click(screen.getByLabelText('Infinite'));
    await user.click(screen.getByRole('button', { name: 'Start session' }));

    expect(await screen.findByText('Question 1 / Infinite')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Answer'), 'Te lo invio');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await user.click(await screen.findByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Vado ___ Roma')).toBeInTheDocument();
    expect(screen.getByText('Question 2 / Infinite')).toBeInTheDocument();
    expect(screen.queryByText('Session complete.')).not.toBeInTheDocument();
    expect(generatedGroupIds).toEqual(['pronome_diretto_presente', 'preposizione']);
  });

  it('completes a fixed-length session after the selected number of questions', async () => {
    const user = userEvent.setup();
    render(App);

    await screen.findByLabelText(/Pronome Diretto PRESENTE/);
    await user.click(screen.getByLabelText('10'));
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    await user.type(await screen.findByLabelText('Answer'), 'Te lo invio');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));

    for (let i = 2; i <= 10; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(screen.getByText(`Question ${i} / 10`)).toBeInTheDocument());
      await user.type(screen.getByLabelText('Answer'), `answer ${i}`);
      await user.click(screen.getByRole('button', { name: 'Check answer' }));
    }

    expect(await screen.findByText('Session complete.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('shows a friendly offline message when the API is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network offline'));

    render(App);

    expect(await screen.findByText(/offline or the backend is unreachable/i)).toBeInTheDocument();
  });
});

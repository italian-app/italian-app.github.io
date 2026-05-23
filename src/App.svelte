<script lang="ts">
  import { answerHelperText } from './lib/answerHelp';
  import { ApiError, checkExercise, generateExercise, getExerciseGroups } from './lib/api';
  import { loadRecentExercises, saveRecentExercise, type RecentExercise } from './lib/recentExercises';
  import type { CheckResult, Exercise, ExerciseGroup } from './lib/types';

  type SessionLength = 10 | 30 | 100;

  const sessionLengthOptions: SessionLength[] = [10, 30, 100];

  let groups: ExerciseGroup[] = [];
  let selectedGroupIds: string[] = [];
  let sessionLength: SessionLength = 30;
  let infiniteMode = false;
  let loadingGroups = true;
  let loadingExercise = false;
  let checkingAnswer = false;
  let appError = '';
  let exercise: Exercise | null = null;
  let checkResult: CheckResult | null = null;
  let answer = '';
  let started = false;
  let currentQuestionNumber = 0;
  let hasInitializedSelection = false;
  let recentExercises: RecentExercise[] = loadRecentExercises();

  $: totalQuestionsLabel = infiniteMode ? 'Infinite' : String(sessionLength);
  $: canStart = selectedGroupIds.length > 0 && !loadingGroups && !loadingExercise;
  $: isSessionComplete = started && !infiniteMode && currentQuestionNumber >= sessionLength && checkResult !== null;

  void loadGroups();

  async function loadGroups() {
    loadingGroups = true;
    appError = '';

    try {
      groups = await getExerciseGroups();
      if (!hasInitializedSelection) {
        selectedGroupIds = groups.map((group) => group.id);
        hasInitializedSelection = true;
      }
    } catch (error) {
      appError = messageForError(error, 'Could not load exercise groups.');
    } finally {
      loadingGroups = false;
    }
  }

  function toggleGroup(groupId: string) {
    selectedGroupIds = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((id) => id !== groupId)
      : [...selectedGroupIds, groupId];
  }

  function selectAllGroups() {
    selectedGroupIds = groups.map((group) => group.id);
  }

  function unselectAllGroups() {
    selectedGroupIds = [];
  }

  async function startSession() {
    started = true;
    currentQuestionNumber = 0;
    await loadNextExercise();
  }

  async function loadNextExercise() {
    if (selectedGroupIds.length === 0) return;

    loadingExercise = true;
    appError = '';
    checkResult = null;
    answer = '';

    const nextQuestionNumber = currentQuestionNumber + 1;
    const groupId = selectedGroupIds[(nextQuestionNumber - 1) % selectedGroupIds.length];

    try {
      exercise = await generateExercise(groupId);
      currentQuestionNumber = nextQuestionNumber;
    } catch (error) {
      appError = messageForError(error, 'Could not generate an exercise.');
      exercise = null;
    } finally {
      loadingExercise = false;
    }
  }

  async function submitAnswer() {
    if (!exercise || !answer.trim()) return;

    checkingAnswer = true;
    appError = '';

    try {
      checkResult = await checkExercise(exercise.exercise_id, answer);
      recentExercises = saveRecentExercise({
        exercise,
        answer,
        result: checkResult,
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      appError = messageForError(
        error,
        'Could not check this answer. The exercise may have expired if the backend restarted.'
      );
    } finally {
      checkingAnswer = false;
    }
  }

  function stopSession() {
    started = false;
    exercise = null;
    checkResult = null;
    answer = '';
    appError = '';
    currentQuestionNumber = 0;
  }

  function messageForError(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      if (error.status === 0) return error.message;
      if (error.status === 404) return `${fallback} ${error.detail ?? 'The requested resource was not found.'}`;
      return `${fallback} ${error.detail ?? error.message}`;
    }

    return fallback;
  }
</script>

<main class="app-shell">
  <section class="app-header" aria-labelledby="app-title">
    <p class="eyebrow">Italian grammar practice</p>
    <h1 id="app-title">Practice one prompt at a time.</h1>
  </section>

  {#if appError}
    <div class="notice error" role="alert">
      <span>{appError}</span>
      {#if !started}
        <button type="button" class="text-button" on:click={loadGroups}>Retry</button>
      {/if}
    </div>
  {/if}

  {#if !started}
    <section class="panel" aria-labelledby="setup-title">
      <div class="panel-heading">
        <h2 id="setup-title">Choose a session</h2>
        <p>Select one or more exercise groups. The app rotates through your choices while generating fresh prompts.</p>
      </div>

      {#if loadingGroups}
        <p class="muted">Loading exercise groups. The live backend can take about 60 seconds to wake up.</p>
      {:else}
        <fieldset>
          <legend>Exercise groups</legend>
          <div class="toolbar group-toolbar">
            <button type="button" class="text-button" on:click={selectAllGroups}>Select all</button>
            <button type="button" class="text-button" on:click={unselectAllGroups}>Unselect all</button>
          </div>
          <div class="option-grid">
            {#each groups as group}
              <label class:selected={selectedGroupIds.includes(group.id)} class="check-card">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(group.id)}
                  on:change={() => toggleGroup(group.id)}
                />
                <span>
                  <strong>{group.title}</strong>
                  <small>{group.description}</small>
                </span>
              </label>
            {/each}
          </div>
        </fieldset>

        <fieldset>
          <legend>Session length</legend>
          <div class="inline-options">
            {#each sessionLengthOptions as option}
              <label class:selected={!infiniteMode && sessionLength === option} class="pill-option">
                <input
                  type="radio"
                  name="session-length"
                  value={option}
                  checked={!infiniteMode && sessionLength === option}
                  on:change={() => {
                    infiniteMode = false;
                    sessionLength = option;
                  }}
                />
                {option}
              </label>
            {/each}
            <label class:selected={infiniteMode} class="pill-option">
              <input type="checkbox" checked={infiniteMode} on:change={() => (infiniteMode = !infiniteMode)} />
              Infinite
            </label>
          </div>
        </fieldset>

        <button type="button" class="primary-button" disabled={!canStart} on:click={startSession}>Start session</button>

        {#if recentExercises.length > 0}
          <section class="recent-review" aria-labelledby="recent-title">
            <h2 id="recent-title">Recent practice</h2>
            <div class="recent-list">
              {#each recentExercises as item}
                <article class="recent-item">
                  <strong>{item.exercise.title}</strong>
                  <p>{item.exercise.query}</p>
                  <small>
                    Your answer: {item.answer} | Expected: {item.result.expected_answers.join(' / ')}
                  </small>
                </article>
              {/each}
            </div>
          </section>
        {/if}
      {/if}
    </section>
  {:else}
    <section class="panel exercise-panel" aria-labelledby="exercise-title">
      <div class="session-bar">
        <span>Question {currentQuestionNumber} / {totalQuestionsLabel}</span>
        <button type="button" class="text-button" on:click={stopSession}>Stop</button>
      </div>

      {#if loadingExercise}
        <p class="muted">Generating exercise. The live backend can be slow on the first request.</p>
      {:else if exercise}
        <div class="exercise-copy">
          <p class="eyebrow">{exercise.group_id}</p>
          <h2 id="exercise-title">{exercise.title}</h2>
          <p>{exercise.description}</p>
          <div class="query">{exercise.query}</div>
          <p class="helper">{answerHelperText(exercise.answer_format)}</p>
        </div>

        <form on:submit|preventDefault={submitAnswer} class="answer-form">
          <label for="answer">Answer</label>
          <input
            id="answer"
            bind:value={answer}
            disabled={checkingAnswer || checkResult !== null}
            autocomplete="off"
          />
          <button type="submit" class="primary-button" disabled={!answer.trim() || checkingAnswer || checkResult !== null}>
            {checkingAnswer ? 'Checking...' : 'Check answer'}
          </button>
        </form>

        {#if checkResult}
          <div class:correct={checkResult.correct} class:incorrect={!checkResult.correct} class="result" role="status">
            <strong>{checkResult.correct ? 'Correct' : 'Not quite'}</strong>
            <p>Expected: {checkResult.expected_answers.join(' / ')}</p>
            {#if checkResult.hint}
              <p>Hint: {checkResult.hint}</p>
            {/if}
          </div>

          {#if isSessionComplete}
            <div class="completion">
              <p>Session complete.</p>
              <button type="button" class="primary-button" on:click={stopSession}>Choose another session</button>
            </div>
          {:else}
            <button type="button" class="primary-button" on:click={loadNextExercise}>Next</button>
          {/if}
        {/if}
      {/if}
    </section>
  {/if}
</main>

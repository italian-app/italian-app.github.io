export type AnswerFormat = 'whole_sentence' | 'only_words' | 'only_preposition';

export interface ExerciseGroup {
  id: string;
  title: string;
  description: string;
}

export interface Exercise {
  exercise_id: string;
  group_id: string;
  title: string;
  description: string;
  query: string;
  answer_format: AnswerFormat;
  metadata?: Record<string, unknown>;
}

export interface CheckResult {
  correct: boolean;
  expected_answers: string[];
  normalized_answer: string;
  hint: string | null;
}

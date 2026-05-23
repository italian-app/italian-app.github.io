import type { AnswerFormat } from './types';

export function answerHelperText(format: AnswerFormat): string {
  switch (format) {
    case 'whole_sentence':
      return 'Write the complete Italian sentence.';
    case 'only_words':
      return 'Write only the requested word or words.';
    case 'only_preposition':
      return 'Write only the preposition.';
    default:
      return 'Write your answer.';
  }
}

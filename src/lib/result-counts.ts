import type { SessionQuestion } from './session';

export function resultCounts(questions: readonly SessionQuestion[]) {
  const total = questions.length;
  const attempted = questions.filter(
    (question) => question.submittedAt !== null,
  ).length;
  const correct = questions.filter(
    (question) => question.feedback === 'correct',
  ).length;
  return {
    total,
    attempted,
    correct,
    incorrect: attempted - correct,
    unanswered: total - attempted,
    percentage: (correct / total) * 100,
  };
}

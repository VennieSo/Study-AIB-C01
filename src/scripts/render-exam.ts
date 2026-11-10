import type { ExamSession, ExamSessionRecord } from '../lib/exam-session';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function formatRemaining(milliseconds: number) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function renderExamGrid(record: ExamSessionRecord) {
  return `<nav class="exam-navigation" aria-label="Exam questions"><h2>Jump to a question</h2><p class="field-note">A check mark (✓) means answered. No check mark means unanswered.</p><div class="exam-question-grid">${record.questions
    .map((item, index) => {
      const answered = item.selectedOptionIds.length > 0;
      return `<button class="exam-question-number ${answered ? 'answered' : ''}" data-action="go-to-exam" data-index="${index}" aria-label="Question ${index + 1}, ${answered ? 'answered' : 'unanswered'}" ${index === record.currentIndex ? 'aria-current="step"' : ''}>${index + 1}${answered ? '<span aria-hidden="true"> ✓</span>' : ''}</button>`;
    })
    .join('')}</div></nav>`;
}

export function renderExam(
  record: ExamSessionRecord,
  result: ReturnType<ExamSession['result']>,
  remaining: number,
) {
  if (record.status === 'completed')
    return `<div class="results-panel">
    <p class="eyebrow">Exam · All domains</p>
    <h1 id="exam-heading" tabindex="-1">Exam complete</h1>
    <p class="muted">Here’s how this assessment went.</p>
    <div class="score-line"><strong class="score">${result.percentage}%</strong><span class="score-caption">${result.correct} of ${result.total} correct<br />Raw practice percentage</span></div>
    <dl class="result-counts" aria-label="Session counts">${[
      ['Total', result.total],
      ['Attempted', result.attempted],
      ['Correct', result.correct],
      ['Incorrect', result.incorrect],
      ['Unanswered', result.unanswered],
    ]
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join('')}</dl>
    <p class="result-footnote">Each question has equal weight. Unanswered questions earn zero. This is a practice result, not an AWS scaled score or a prediction of passing.</p>
    <div class="question-actions"><button class="button primary" data-action="restart-exam">Exam again <span aria-hidden="true">↻</span></button><button class="button" data-action="configure-exam">Change configuration</button></div>
  </div>`;
  const current = record.questions[record.currentIndex]!;
  const question = current.snapshot;
  const answered = record.questions.filter(
    (item) => item.selectedOptionIds.length > 0,
  ).length;
  return `<div class="session-top"><span class="session-mode">Exam <span aria-hidden="true">/</span> <span role="timer" aria-label="Time remaining" id="exam-time">${formatRemaining(remaining)}</span> remaining</span><button class="button" data-action="configure-exam">End exam</button></div>
    <div class="progress-heading"><span>Question ${record.currentIndex + 1} of ${record.questions.length}</span><span>${answered} answered · ${record.questions.length - answered} unanswered</span></div>
    <progress value="${record.currentIndex + 1}" max="${record.questions.length}" aria-label="Question progress"></progress>
    <div class="question-panel">
      <h1 id="exam-heading" tabindex="-1">${question.text
        .split(/\r?\n\s*\r?\n/)
        .map(
          (paragraph) =>
            `<span class="question-paragraph">${escape(paragraph)}</span>`,
        )
        .join('')}</h1>
      <fieldset><legend class="sr-only">${question.type === 'multiple' ? 'Answer options: select one or more' : 'Answer options'}</legend>
        ${question.options.map((option, index) => `<label class="answer-card"><input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" name="exam-answer" value="${escape(option.id)}" ${current.selectedOptionIds.includes(option.id) ? 'checked' : ''} /><span class="answer-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span class="answer-text">${escape(option.text)}</span></label>`).join('')}
      </fieldset>
      <p id="exam-answer-error" class="error" role="alert"></p>
      <div class="question-actions"><button class="button" data-action="previous-exam" ${record.currentIndex === 0 ? 'disabled' : ''}>Previous question</button><button class="button primary" data-action="next-exam" ${record.currentIndex === record.questions.length - 1 ? 'disabled' : ''}>Next question <span aria-hidden="true">→</span></button><button class="button" data-action="submit-exam">Submit exam</button></div>
    </div>${renderExamGrid(record)}<p class="session-note">You may skip questions and revise selections until submission or time expiry. Progress stays in this tab only. Refreshing or closing discards the session.</p>`;
}

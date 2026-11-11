import { getDomain } from '../lib/exam-scope';
import type { PracticeSession, PracticeSessionRecord } from '../lib/session';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

const checkIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>';
const crossIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>';

export function renderSession(
  record: PracticeSessionRecord,
  result: ReturnType<PracticeSession['result']>,
  domainResults: ReturnType<PracticeSession['domainResults']>,
) {
  const scopeName =
    record.configuration.domainId === 'all'
      ? 'All domains'
      : getDomain(record.configuration.domainId).name;
  if (record.status === 'completed') {
    return `<div class="results-panel">
      <p class="eyebrow">Practice · ${escape(scopeName)}</p>
      <span class="completion-mark" aria-hidden="true">${checkIcon}</span>
      <h1 id="session-heading" tabindex="-1">Practice complete</h1>
      <p class="muted">Here’s how this session went.</p>
      <div class="score-line"><strong class="score">${Number(result.percentage.toFixed(1))}%</strong><span class="score-caption">${result.correct} of ${result.total} correct<br />Raw practice percentage</span></div>
      <dl class="result-counts" aria-label="Session counts">${[
        ['Total', result.total],
        ['Attempted', result.attempted],
        ['Correct', result.correct],
        ['Incorrect', result.incorrect],
        ['Unanswered', result.unanswered],
      ]
        .map(
          ([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`,
        )
        .join('')}</dl>
      <section class="domain-results" aria-labelledby="domain-results-heading">
        <h2 id="domain-results-heading">Performance by domain</h2>
        <div class="table-scroll"><table aria-label="Practice performance by domain"><thead><tr><th scope="col">Domain</th><th scope="col">Correct</th><th scope="col">Percentage</th></tr></thead><tbody>
        ${domainResults.map((row) => `<tr><th scope="row">${escape(getDomain(row.domainId).name)}</th><td>${row.correct} of ${row.total}</td><td>${Number(row.percentage.toFixed(1))}%</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <p class="result-footnote">Each question has equal weight. This is a practice result, not an AWS scaled score or a prediction of passing.</p>
      <div class="question-actions"><button class="button primary" data-action="restart">Practice again <span aria-hidden="true">↻</span></button><button class="button" data-action="configure">End practice</button></div>
    </div>`;
  }

  const current = record.questions[record.currentIndex]!;
  const question = current.snapshot;
  const domain = getDomain(question.domainId);
  const questionText = question.text
    .split(/\r?\n\s*\r?\n/)
    .map(
      (paragraph) =>
        `<span class="question-paragraph">${escape(paragraph)}</span>`,
    )
    .join('');
  const submitted = current.submittedAt !== null;
  const correctAnswers = question.options
    .filter((option) => question.correctOptionIds.includes(option.id))
    .map((option) => option.text);
  return `<div class="session-top"><span class="session-mode">Practice <span aria-hidden="true">/</span> Untimed</span><button class="button" data-action="configure">End practice</button></div>
    <div class="progress-heading"><span>Question ${record.currentIndex + 1} of ${record.questions.length}</span><span class="pill">${escape(domain.name)}</span></div>
    <progress value="${record.currentIndex + 1}" max="${record.questions.length}" aria-label="Question progress"></progress>
    <div class="question-panel">
      <p class="eyebrow">Domain ${domain.number} · Task ${escape(question.taskId)}</p>
      <h1 id="session-heading" tabindex="-1">${questionText}</h1>
      <form id="answer-form" novalidate>
        <fieldset aria-describedby="answer-error"><legend class="sr-only">${question.type === 'multiple' ? 'Answer options: select one or more' : 'Answer options'}</legend>
          ${question.options
            .map((option, index) => {
              const selected = current.selectedOptionIds.includes(option.id);
              const correct = question.correctOptionIds.includes(option.id);
              const missed =
                question.type === 'multiple' && correct && !selected;
              const label = submitted
                ? [
                    missed
                      ? 'Missed correct answer'
                      : correct
                        ? 'Correct answer'
                        : '',
                    selected ? 'Your answer' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : '';
              return `<label class="answer-card${submitted && missed ? ' missed-answer' : submitted && correct ? ' correct-answer' : submitted && selected ? ' wrong-answer' : ''}">
              <input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" name="answer" value="${escape(option.id)}" ${selected ? 'checked' : ''} ${submitted ? 'disabled' : ''} />
              <span class="answer-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span class="answer-text">${escape(option.text)}${label ? `<span class="answer-status">${correct ? checkIcon : crossIcon}${label}</span>` : ''}</span>
            </label>`;
            })
            .join('')}
        </fieldset>
        <p id="answer-error" class="error" role="alert"></p>
        ${
          submitted
            ? `<section class="feedback ${current.feedback}" aria-labelledby="feedback-heading" role="status">
          <h2 id="feedback-heading" tabindex="-1"><span class="feedback-icon" aria-hidden="true">${current.feedback === 'correct' ? checkIcon : crossIcon}</span>${current.feedback === 'correct' ? 'Correct' : 'Incorrect'}</h2>
          <p class="correct-label">Correct ${question.type === 'multiple' ? 'answers' : 'answer'}: ${escape(correctAnswers.join('; '))}</p>
          <p>${escape(question.explanation)}</p>
          ${question.references?.length ? `<ul>${question.references.map((reference) => `<li><a href="${escape(reference.url)}" target="_blank" rel="noopener noreferrer">${escape(reference.title)} <span class="sr-only">(opens in a new tab)</span></a></li>`).join('')}</ul>` : ''}
        </section>`
            : ''
        }
        <div class="question-actions"><button class="button${submitted ? '' : ' primary'}" type="submit" ${submitted ? 'disabled' : ''}>Submit answer</button><button class="button${submitted ? ' primary' : ''}" type="button" data-action="next" ${submitted ? '' : 'disabled'}>${record.currentIndex === record.questions.length - 1 ? 'See results' : 'Next question'} <span aria-hidden="true">→</span></button></div>
      </form>
    </div><p class="session-note">Progress stays in this tab only. Refreshing or closing discards the session.</p>`;
}

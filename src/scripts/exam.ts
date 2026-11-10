import {
  ExamSession,
  examAvailability,
  type ExamQuestionCount,
} from '../lib/exam-session';
import { MemorySessionStorage } from '../lib/session';
import type { Question } from '../lib/questions';
import { formatRemaining, renderExam, renderExamGrid } from './render-exam';

function initialize() {
  const home = document.querySelector<HTMLElement>('#home-view')!;
  const root = document.querySelector<HTMLElement>('#exam-session-view')!;
  const preset = document.querySelector<HTMLSelectElement>('#exam-preset')!;
  const selectedCount = () => Number(preset.value) as ExamQuestionCount;
  const start = document.querySelector<HTMLButtonElement>('#start-exam')!;
  const error = document.querySelector<HTMLElement>(
    '#exam-configuration-error',
  )!;
  const questions: Question[] = JSON.parse(
    document.querySelector('#question-data')!.textContent!,
  );
  const storage = new MemorySessionStorage();
  let session: ExamSession | undefined;
  let starting = false;
  let renderedStatus: string | undefined;

  function availability() {
    const availability = examAvailability(questions, selectedCount());
    document.querySelector('#exam-availability')!.textContent =
      availability.message;
    start.disabled = starting || !availability.available;
  }

  function render() {
    if (!session) return;
    const record = session.record;
    root.innerHTML = renderExam(
      record,
      session.result(),
      session.remainingMilliseconds(),
      session.domainResults(),
    );
    renderedStatus = record.status;
    home.hidden = true;
    root.hidden = false;
    root.querySelector<HTMLElement>('#exam-heading')!.focus();
  }

  async function begin() {
    if (starting) return;
    starting = true;
    availability();
    error.textContent = '';
    try {
      session = await ExamSession.start(
        questions,
        { storage },
        selectedCount(),
      );
      render();
      window.scrollTo({ top: 0 });
    } catch (cause) {
      error.textContent =
        cause instanceof Error ? cause.message : 'Unable to start exam.';
    } finally {
      starting = false;
      availability();
    }
  }

  function tick() {
    if (!session) return;
    session.checkDeadline();
    if (session.record.status === 'completed' && renderedStatus !== 'completed')
      render();
    const timer = root.querySelector('#exam-time');
    if (timer)
      timer.textContent = formatRemaining(session.remainingMilliseconds());
  }

  function configure(heading = '#exam-configuration-heading') {
    tick();
    if (session?.record.status === 'active') {
      if (
        !window.confirm(
          'End this exam? Your current progress will be discarded.',
        )
      ) {
        tick();
        return;
      }
      session.checkDeadline();
      if (session.remainingMilliseconds() === 0) {
        render();
        return;
      }
      session.abandon();
    }
    session = undefined;
    renderedStatus = undefined;
    root.hidden = true;
    root.innerHTML = '';
    home.hidden = false;
    document.querySelector<HTMLElement>(heading)!.focus();
  }

  preset.addEventListener('change', availability);
  document
    .querySelector('#exam-configuration-form')!
    .addEventListener('submit', (event) => {
      event.preventDefault();
      if (!start.disabled) void begin();
    });
  for (const id of ['#practice-link', '#exam-link'])
    document.querySelector(id)!.addEventListener('click', (event) => {
      if (!session) return;
      event.preventDefault();
      configure(
        id === '#practice-link'
          ? '#configuration-heading'
          : '#exam-configuration-heading',
      );
    });
  root.addEventListener('change', (event) => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.name !== 'exam-answer' ||
      !session
    )
      return;
    try {
      session.select(
        Array.from(
          root.querySelectorAll<HTMLInputElement>(
            'input[name="exam-answer"]:checked',
          ),
          (input) => input.value,
        ),
      );
      const answered = session.record.questions.filter(
        (question) => question.selectedOptionIds.length > 0,
      ).length;
      root.querySelector('.progress-heading span:last-child')!.textContent =
        `${answered} answered · ${session.record.questions.length - answered} unanswered`;
      root.querySelector('.exam-navigation')!.outerHTML = renderExamGrid(
        session.record,
      );
      root.querySelector<HTMLButtonElement>(
        '[data-action="clear-exam-answer"]',
      )!.disabled =
        session.record.questions[session.record.currentIndex]!.selectedOptionIds
          .length === 0;
    } catch {
      tick();
    }
  });
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !session) return;
    const button = event.target.closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!button || button.disabled) return;
    tick();
    if (
      session.record.status === 'completed' &&
      !['restart-exam', 'configure-exam'].includes(button.dataset['action']!)
    )
      return;
    switch (button.dataset['action']) {
      case 'clear-exam-answer':
        session.select([]);
        render();
        break;
      case 'go-to-exam':
        session.goTo(Number(button.dataset['index']));
        render();
        break;
      case 'previous-exam':
        session.previous();
        render();
        break;
      case 'next-exam':
        session.next();
        render();
        break;
      case 'submit-exam': {
        const unanswered = session.unansweredCount();
        if (
          window.confirm(
            `Submit exam with ${unanswered} unanswered ${unanswered === 1 ? 'question' : 'questions'}? You cannot change answers after submission.`,
          )
        ) {
          session.submit();
          render();
        } else tick();
        break;
      }
      case 'restart-exam':
        void begin();
        break;
      case 'configure-exam':
        configure();
        break;
    }
  });
  window.setInterval(tick, 1000);
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('focus', tick);
  window.addEventListener('pageshow', tick);
  window.addEventListener('beforeunload', (event) => {
    if (session?.record.status === 'active') event.preventDefault();
  });
  availability();
}

try {
  initialize();
} catch {
  document.querySelector('#application-error')!.textContent =
    'Exam could not load. Please refresh the page or try again later.';
}

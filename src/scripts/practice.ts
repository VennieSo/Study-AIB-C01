import { domains, type DomainId } from '../lib/exam-scope';
import { practiceQuestions, type Question } from '../lib/questions';
import { MemorySessionStorage, PracticeSession } from '../lib/session';
import { renderSession } from './render-session';

function initialize() {
  const home = document.querySelector<HTMLElement>('#home-view')!;
  const root = document.querySelector<HTMLElement>('#session-view')!;
  const selector = document.querySelector<HTMLSelectElement>('#domain')!;
  const start = document.querySelector<HTMLButtonElement>('#start-button')!;
  const configurationError = document.querySelector<HTMLElement>(
    '#configuration-error',
  )!;
  const questions: Question[] = JSON.parse(
    document.querySelector('#question-data')!.textContent!,
  );
  const storage = new MemorySessionStorage();
  let session: PracticeSession | undefined;
  let starting = false;

  function domainId(): DomainId {
    const domain = domains.find((candidate) => candidate.id === selector.value);
    if (!domain) throw new Error('Choose a valid domain.');
    return domain.id;
  }

  function availability() {
    const count = practiceQuestions(questions, domainId()).length;
    document.querySelector('#availability')!.textContent =
      count >= 10
        ? `${count} single-answer questions available. 10 will be sampled.`
        : `${count} questions available. This domain needs at least 10 single-answer questions.`;
    start.disabled = count < 10 || starting;
  }

  function render(focus: 'question' | 'feedback' = 'question') {
    if (!session) return;
    root.innerHTML = renderSession(session.record, session.result());
    home.hidden = true;
    root.hidden = false;
    root
      .querySelector<HTMLElement>(
        focus === 'feedback' ? '#feedback-heading' : '#session-heading',
      )
      ?.focus();
  }

  async function startSession(id: DomainId) {
    if (starting) return;
    starting = true;
    availability();
    configurationError.textContent = '';
    try {
      session = await PracticeSession.start(id, questions, { storage });
      render();
      window.scrollTo({ top: 0 });
    } catch (error) {
      configurationError.textContent =
        error instanceof Error ? error.message : 'Unable to start practice.';
    } finally {
      starting = false;
      availability();
    }
  }

  function configure() {
    if (session?.record.status === 'active') {
      if (
        !window.confirm(
          'End this practice session? Your current progress will be discarded.',
        )
      )
        return;
      session.abandon();
    }
    session = undefined;
    root.hidden = true;
    root.innerHTML = '';
    home.hidden = false;
    document.querySelector<HTMLElement>('#configuration-heading')!.focus();
  }

  selector.addEventListener('change', availability);
  document
    .querySelector('#configuration-form')!
    .addEventListener('submit', (event) => {
      event.preventDefault();
      if (!start.disabled) void startSession(domainId());
    });
  document
    .querySelector('#practice-link')!
    .addEventListener('click', (event) => {
      if (session) {
        event.preventDefault();
        configure();
      }
    });
  root.addEventListener('change', (event) => {
    if (
      event.target instanceof HTMLInputElement &&
      event.target.name === 'answer' &&
      session
    ) {
      session.select([event.target.value]);
      root.querySelector('#answer-error')!.textContent = '';
    }
  });
  root.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!session) return;
    try {
      session.submit();
      render('feedback');
    } catch (error) {
      root.querySelector('#answer-error')!.textContent =
        error instanceof Error ? error.message : 'Unable to submit answer.';
    }
  });
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !session) return;
    const button = event.target.closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!button || button.disabled) return;
    switch (button.dataset['action']) {
      case 'next':
        session.next();
        render();
        break;
      case 'configure':
        configure();
        break;
      case 'restart':
        void startSession(session.record.configuration.domainId);
        break;
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (session?.record.status === 'active') {
      event.preventDefault();
    }
  });
  availability();
}

try {
  initialize();
} catch {
  document.querySelector('#application-error')!.textContent =
    'Practice could not load. Please refresh the page or try again later.';
}

import { domains } from '../lib/exam-scope';
import {
  practiceAvailability,
  type PracticeScope,
  type Question,
} from '../lib/questions';
import { MemorySessionStorage, PracticeSession } from '../lib/session';
import { renderSession } from './render-session';

function initialize() {
  const home = document.querySelector<HTMLElement>('#home-view')!;
  const root = document.querySelector<HTMLElement>('#session-view')!;
  const selector = document.querySelector<HTMLSelectElement>('#domain')!;
  const sizeSelector =
    document.querySelector<HTMLSelectElement>('#question-count')!;
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
  let showQuestionMetadata = true;

  function domainId(): PracticeScope {
    if (selector.value === 'all') return 'all';
    const domain = domains.find((candidate) => candidate.id === selector.value);
    if (!domain) throw new Error('Choose a valid domain.');
    return domain.id;
  }

  function availability() {
    const { count, sizes } = practiceAvailability(questions, domainId());
    const previous = sizeSelector.value;
    sizeSelector.replaceChildren(
      ...sizes.map(({ questionCount, available }) => {
        const option = new Option(
          `${questionCount} questions${available ? '' : ' — unavailable'}`,
          String(questionCount),
        );
        option.disabled = !available;
        return option;
      }),
    );
    sizeSelector.value = sizes.some(
      (size) => String(size.questionCount) === previous && size.available,
    )
      ? previous
      : String(
          sizes.find((size) => size.available)?.questionCount ??
            sizes[0]!.questionCount,
        );
    const selected = sizes.find(
      (size) => String(size.questionCount) === sizeSelector.value,
    )!;
    document.querySelector('#availability')!.textContent = selected.available
      ? `${count} questions available. ${selected.questionCount} will be sampled.`
      : `${count} questions available. This scope needs at least ${selected.questionCount} questions.`;
    start.disabled = !selected.available || starting;
  }

  function render(focus: 'question' | 'feedback' = 'question') {
    if (!session) return;
    root.innerHTML = renderSession(
      session.record,
      session.result(),
      session.domainResults(),
      showQuestionMetadata,
    );
    home.hidden = true;
    root.hidden = false;
    root
      .querySelector<HTMLElement>(
        focus === 'feedback' ? '#feedback-heading' : '#session-heading',
      )
      ?.focus();
  }

  async function startSession(
    id: PracticeScope,
    count = Number(sizeSelector.value),
  ) {
    if (starting) return;
    starting = true;
    availability();
    configurationError.textContent = '';
    try {
      session = await PracticeSession.start(id, questions, { storage }, count);
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

  function configure(heading = '#configuration-heading') {
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
    document.querySelector<HTMLElement>(heading)!.focus();
  }

  selector.addEventListener('change', availability);
  sizeSelector.addEventListener('change', availability);
  document
    .querySelector('#configuration-form')!
    .addEventListener('submit', (event) => {
      event.preventDefault();
      if (!start.disabled) void startSession(domainId());
    });
  for (const id of ['#practice-link', '#exam-link'])
    document.querySelector(id)!.addEventListener('click', (event) => {
      if (session) {
        event.preventDefault();
        configure(
          id === '#exam-link'
            ? '#exam-configuration-heading'
            : '#configuration-heading',
        );
      }
    });
  root.addEventListener('change', (event) => {
    if (
      event.target instanceof HTMLInputElement &&
      event.target.name === 'answer' &&
      session
    ) {
      session.select(
        Array.from(
          root.querySelectorAll<HTMLInputElement>(
            'input[name="answer"]:checked',
          ),
          (input) => input.value,
        ),
      );
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
      case 'toggle-metadata':
        showQuestionMetadata = !showQuestionMetadata;
        root.querySelector<HTMLElement>('#question-metadata')!.hidden =
          !showQuestionMetadata;
        button.setAttribute('aria-expanded', String(showQuestionMetadata));
        button.textContent = `${showQuestionMetadata ? 'Hide' : 'Show'} domain & task`;
        break;
      case 'next':
        session.next();
        render();
        break;
      case 'configure':
        configure();
        break;
      case 'restart':
        void startSession(
          session.record.configuration.domainId,
          session.record.configuration.questionCount,
        );
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

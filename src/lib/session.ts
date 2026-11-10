import { z } from 'zod';
import { domains } from './exam-scope';
import { resultCounts } from './result-counts';
import {
  loadQuestionBanks,
  practiceQuestions,
  practiceSizes,
  type PracticeScope,
  type Question,
} from './questions';

export interface SessionQuestion {
  snapshot: Question;
  revision: string;
  selectedOptionIds: string[];
  submittedAt: string | null;
  feedback: 'correct' | 'incorrect' | null;
}

export interface PracticeSessionRecord {
  schemaVersion: 1;
  id: string;
  mode: 'practice';
  configuration: { domainId: PracticeScope; questionCount: number };
  questions: SessionQuestion[];
  currentIndex: number;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  updatedAt: string;
  deadlineAt: string | null;
  completedAt: string | null;
}

export type SessionRecord =
  PracticeSessionRecord | import('./exam-session').ExamSessionRecord;

export interface SessionStorage {
  save(record: SessionRecord): void;
  load(id: string): SessionRecord | undefined;
}

export class MemorySessionStorage implements SessionStorage {
  private records = new Map<string, SessionRecord>();
  save(record: SessionRecord) {
    this.records.set(record.id, structuredClone(record));
  }
  load(id: string) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }
}

export interface Dependencies {
  storage: SessionStorage;
  clock?: () => number;
  random?: () => number;
  createId?: () => string;
}

const recordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().trim().min(1),
  mode: z.literal('practice'),
  configuration: z.strictObject({
    domainId: z.enum([...domains.map((domain) => domain.id), 'all']),
    questionCount: z.number().int().positive(),
  }),
  questions: z
    .array(
      z.strictObject({
        snapshot: z.custom<Question>(),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        selectedOptionIds: z.array(z.string()),
        submittedAt: z.iso.datetime().nullable(),
        feedback: z.enum(['correct', 'incorrect']).nullable(),
      }),
    )
    .min(1),
  currentIndex: z.number().int().min(0),
  status: z.enum(['active', 'completed', 'abandoned']),
  startedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deadlineAt: z.null(),
  completedAt: z.iso.datetime().nullable(),
});

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function revision(question: Question) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJson(question)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export class PracticeSession {
  private constructor(
    private state: PracticeSessionRecord,
    private dependencies: Dependencies,
  ) {}

  static async start(
    domainId: PracticeScope,
    bank: readonly Question[],
    dependencies: Dependencies,
    questionCount = 10,
  ) {
    if (!practiceSizes(domainId).includes(questionCount))
      throw new Error('Choose an approved Practice size for this scope.');
    const validated = loadQuestionBanks(
      Object.fromEntries(
        domains.map((domain) => [
          domain.id,
          {
            schemaVersion: 1,
            questions: bank.filter(
              (question) => question.domainId === domain.id,
            ),
          },
        ]),
      ),
    );
    if (validated.length !== bank.length)
      throw new Error('Invalid question domain.');
    const pool = practiceQuestions(validated, domainId);
    if (pool.length < questionCount)
      throw new Error(
        `This scope needs at least ${questionCount} questions; ${pool.length} available.`,
      );
    const random = dependencies.random ?? Math.random;
    for (let i = pool.length - 1; i > 0; i--) {
      const value = random();
      if (value < 0 || value >= 1 || !Number.isFinite(value))
        throw new Error('Random must return a value in [0, 1).');
      const j = Math.floor(value * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const startedAt = new Date(
      (dependencies.clock ?? Date.now)(),
    ).toISOString();
    const state: PracticeSessionRecord = {
      schemaVersion: 1,
      id: (dependencies.createId ?? (() => crypto.randomUUID()))(),
      mode: 'practice',
      configuration: { domainId, questionCount },
      questions: await Promise.all(
        pool.slice(0, questionCount).map(async (snapshot) => ({
          snapshot,
          revision: await revision(snapshot),
          selectedOptionIds: [],
          submittedAt: null,
          feedback: null,
        })),
      ),
      currentIndex: 0,
      status: 'active',
      startedAt,
      updatedAt: startedAt,
      deadlineAt: null,
      completedAt: null,
    };
    dependencies.storage.save(state);
    return new PracticeSession(state, dependencies);
  }

  static async restore(input: unknown, dependencies: Dependencies) {
    const state: PracticeSessionRecord = recordSchema.parse(input);
    const { domainId, questionCount } = state.configuration;
    if (
      !practiceSizes(domainId).includes(questionCount) ||
      state.questions.length !== questionCount ||
      state.currentIndex >= questionCount
    )
      throw new Error('Invalid Practice configuration or question count.');
    const snapshots = state.questions.map((question) => question.snapshot);
    const validated = loadQuestionBanks(
      Object.fromEntries(
        domains.map((domain) => [
          domain.id,
          {
            schemaVersion: 1,
            questions: snapshots.filter(
              (question) => question?.domainId === domain.id,
            ),
          },
        ]),
      ),
    );
    if (
      validated.length !== questionCount ||
      practiceQuestions(validated, domainId).length !== questionCount
    )
      throw new Error('Invalid session question scope.');
    const start = Date.parse(state.startedAt);
    const updated = Date.parse(state.updatedAt);
    if (
      updated < start ||
      (state.status === 'completed') !== (state.completedAt !== null) ||
      (state.completedAt !== null &&
        (Date.parse(state.completedAt) < start ||
          Date.parse(state.completedAt) > updated))
    ) {
      throw new Error('Invalid session lifecycle timestamps.');
    }
    let previousSubmission = start;
    for (const [index, question] of state.questions.entries()) {
      const { snapshot, selectedOptionIds, submittedAt, feedback } = question;
      if (
        (snapshot.type === 'single' && selectedOptionIds.length > 1) ||
        new Set(selectedOptionIds).size !== selectedOptionIds.length ||
        question.revision !== (await revision(snapshot)) ||
        selectedOptionIds.some(
          (id) => !snapshot.options.some((option) => option.id === id),
        )
      ) {
        throw new Error('Invalid session question snapshot or selection.');
      }
      if (
        submittedAt === null
          ? feedback !== null
          : selectedOptionIds.length === 0 ||
            feedback !==
              (selectedOptionIds.length === snapshot.correctOptionIds.length &&
              selectedOptionIds.every((id) =>
                snapshot.correctOptionIds.includes(id),
              )
                ? 'correct'
                : 'incorrect')
      ) {
        throw new Error('Invalid submission or feedback.');
      }
      if (
        (index < state.currentIndex && submittedAt === null) ||
        (index > state.currentIndex &&
          (submittedAt !== null || selectedOptionIds.length > 0)) ||
        (state.status === 'completed' &&
          (submittedAt === null ||
            state.currentIndex !== state.questions.length - 1))
      ) {
        throw new Error('Invalid session progress.');
      }
      if (submittedAt !== null) {
        const timestamp = Date.parse(submittedAt);
        if (
          timestamp < previousSubmission ||
          timestamp > updated ||
          (state.completedAt !== null &&
            timestamp > Date.parse(state.completedAt))
        )
          throw new Error('Invalid submission timestamp.');
        previousSubmission = timestamp;
      }
    }
    const restored = structuredClone(state);
    dependencies.storage.save(restored);
    return new PracticeSession(restored, dependencies);
  }

  get record(): PracticeSessionRecord {
    return structuredClone(this.state);
  }

  private activeQuestion() {
    if (this.state.status !== 'active')
      throw new Error('This session is no longer active.');
    return this.state.questions[this.state.currentIndex]!;
  }

  private persist() {
    this.state.updatedAt = new Date(
      (this.dependencies.clock ?? Date.now)(),
    ).toISOString();
    this.dependencies.storage.save(this.state);
  }

  select(optionIds: string[]) {
    const current = this.activeQuestion();
    if (current.submittedAt)
      throw new Error('Answers are locked after submission.');
    if (
      (current.snapshot.type === 'single' && optionIds.length > 1) ||
      new Set(optionIds).size !== optionIds.length ||
      optionIds.some(
        (id) => !current.snapshot.options.some((option) => option.id === id),
      )
    ) {
      throw new Error(
        current.snapshot.type === 'single'
          ? 'Select one valid option.'
          : 'Select valid options without duplicates.',
      );
    }
    current.selectedOptionIds = [...optionIds];
    this.persist();
  }

  submit() {
    const current = this.activeQuestion();
    if (current.submittedAt)
      throw new Error('Answers are locked after submission.');
    if (!current.selectedOptionIds.length)
      throw new Error('Select an answer before submitting.');
    current.feedback =
      current.selectedOptionIds.length ===
        current.snapshot.correctOptionIds.length &&
      current.selectedOptionIds.every((id) =>
        current.snapshot.correctOptionIds.includes(id),
      )
        ? 'correct'
        : 'incorrect';
    current.submittedAt = new Date(
      (this.dependencies.clock ?? Date.now)(),
    ).toISOString();
    this.persist();
  }

  next() {
    if (!this.activeQuestion().submittedAt)
      throw new Error('Submit your answer before continuing.');
    if (this.state.currentIndex === this.state.questions.length - 1) {
      this.state.status = 'completed';
      this.state.completedAt = new Date(
        (this.dependencies.clock ?? Date.now)(),
      ).toISOString();
    } else {
      this.state.currentIndex++;
    }
    this.persist();
  }

  abandon() {
    this.activeQuestion();
    this.state.status = 'abandoned';
    this.persist();
  }

  domainResults() {
    return domains.flatMap((domain) => {
      const questions = this.state.questions.filter(
        ({ snapshot }) => snapshot.domainId === domain.id,
      );
      return questions.length
        ? [{ domainId: domain.id, ...resultCounts(questions) }]
        : [];
    });
  }

  result() {
    return resultCounts(this.state.questions);
  }
}

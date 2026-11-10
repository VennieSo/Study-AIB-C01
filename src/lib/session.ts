import { z } from 'zod';
import { domains, type DomainId } from './exam-scope';
import {
  loadQuestionBanks,
  practiceQuestions,
  type Question,
} from './questions';

export interface SessionQuestion {
  snapshot: Question;
  revision: string;
  selectedOptionIds: string[];
  submittedAt: string | null;
  feedback: 'correct' | 'incorrect' | null;
}

export interface SessionRecord {
  schemaVersion: 1;
  id: string;
  mode: 'practice';
  configuration: { domainId: DomainId; questionCount: 10 };
  questions: SessionQuestion[];
  currentIndex: number;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  updatedAt: string;
  deadlineAt: string | null;
  completedAt: string | null;
}

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

interface Dependencies {
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
    domainId: z.enum(domains.map((domain) => domain.id)),
    questionCount: z.literal(10),
  }),
  questions: z
    .array(
      z.strictObject({
        snapshot: z.custom<Question>(),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        selectedOptionIds: z.array(z.string()).max(1),
        submittedAt: z.iso.datetime().nullable(),
        feedback: z.enum(['correct', 'incorrect']).nullable(),
      }),
    )
    .length(10),
  currentIndex: z.number().int().min(0).max(9),
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
    private state: SessionRecord,
    private dependencies: Dependencies,
  ) {}

  static async start(
    domainId: DomainId,
    bank: readonly Question[],
    dependencies: Dependencies,
  ) {
    const pool = loadQuestionBanks({
      [domainId]: {
        schemaVersion: 1,
        questions: practiceQuestions(bank, domainId),
      },
    });
    if (pool.length < 10)
      throw new Error('This domain needs at least 10 single-answer questions.');
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
    const state: SessionRecord = {
      schemaVersion: 1,
      id: (dependencies.createId ?? (() => crypto.randomUUID()))(),
      mode: 'practice',
      configuration: { domainId, questionCount: 10 },
      questions: await Promise.all(
        pool.slice(0, 10).map(async (snapshot) => ({
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
    const state: SessionRecord = recordSchema.parse(input);
    loadQuestionBanks({
      [state.configuration.domainId]: {
        schemaVersion: 1,
        questions: state.questions.map((question) => question.snapshot),
      },
    });
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
        snapshot.type !== 'single' ||
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
              (selectedOptionIds.every((id) =>
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
          (submittedAt === null || state.currentIndex !== 9))
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

  get record(): SessionRecord {
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
      optionIds.length > 1 ||
      optionIds.some(
        (id) => !current.snapshot.options.some((option) => option.id === id),
      )
    ) {
      throw new Error('Select one valid option.');
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

  result() {
    const total = this.state.questions.length;
    const attempted = this.state.questions.filter(
      (question) => question.submittedAt !== null,
    ).length;
    const correct = this.state.questions.filter(
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
}

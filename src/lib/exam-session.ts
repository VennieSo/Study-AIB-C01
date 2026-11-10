import { z } from 'zod';
import { domains } from './exam-scope';
import { loadQuestionBanks, type Question } from './questions';
import type { Dependencies, SessionQuestion } from './session';

export interface ExamSessionRecord {
  schemaVersion: 1;
  id: string;
  mode: 'exam';
  configuration: { domainId: 'all'; questionCount: 20; durationMinutes: 30 };
  questions: SessionQuestion[];
  currentIndex: number;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  updatedAt: string;
  deadlineAt: string;
  completedAt: string | null;
}

const recordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().trim().min(1),
  mode: z.literal('exam'),
  configuration: z.strictObject({
    domainId: z.literal('all'),
    questionCount: z.literal(20),
    durationMinutes: z.literal(30),
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
    .length(20),
  currentIndex: z.number().int().min(0).max(19),
  status: z.enum(['active', 'completed', 'abandoned']),
  startedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deadlineAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new Error('Random must return a value in [0, 1).');
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
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

function validatedBank(bank: readonly Question[]) {
  if (
    bank.some(
      (question) => !domains.some((domain) => domain.id === question.domainId),
    )
  )
    throw new Error('Invalid exam domain.');
  return loadQuestionBanks(
    Object.fromEntries(
      domains.map((domain) => [
        domain.id,
        {
          schemaVersion: 1,
          questions: bank.filter((question) => question.domainId === domain.id),
        },
      ]),
    ),
  );
}

export function examAvailability(bank: readonly Question[]) {
  const pool = validatedBank(bank);
  const shortages = domains.filter(
    (domain) =>
      pool.filter((question) => question.domainId === domain.id).length < 5,
  );
  return {
    available: shortages.length === 0,
    message:
      shortages.length === 0
        ? `${pool.length} questions available. 20 will be sampled across all domains.`
        : `This exam needs at least 5 questions in every domain. Not enough questions in ${shortages.map((domain) => domain.name).join('; ')}.`,
  };
}

export class ExamSession {
  private constructor(
    private state: ExamSessionRecord,
    private dependencies: Dependencies,
  ) {}

  static async start(bank: readonly Question[], dependencies: Dependencies) {
    const pool = validatedBank(bank);
    const random = dependencies.random ?? Math.random;
    // Stable remainder sorting preserves the shuffled priority for ties.
    const allocations = shuffle(domains, random)
      .map((domain) => ({
        domainId: domain.id,
        count: Math.floor((20 * domain.weight) / 100),
        remainder: (20 * domain.weight) % 100,
      }))
      .sort((a, b) => b.remainder - a.remainder);
    let remaining =
      20 - allocations.reduce((sum, allocation) => sum + allocation.count, 0);
    for (const allocation of allocations)
      if (remaining-- > 0) allocation.count++;
    const selected: Question[] = [];
    for (const allocation of allocations) {
      const eligible = pool.filter(
        (question) => question.domainId === allocation.domainId,
      );
      if (eligible.length < allocation.count)
        throw new Error(
          `Exam needs ${allocation.count} questions in ${allocation.domainId}; found ${eligible.length}.`,
        );
      selected.push(...shuffle(eligible, random).slice(0, allocation.count));
    }
    const started = (dependencies.clock ?? Date.now)();
    const startedAt = new Date(started).toISOString();
    const state: ExamSessionRecord = {
      schemaVersion: 1,
      id: (dependencies.createId ?? (() => crypto.randomUUID()))(),
      mode: 'exam',
      configuration: {
        domainId: 'all',
        questionCount: 20,
        durationMinutes: 30,
      },
      questions: await Promise.all(
        shuffle(selected, random).map(async (snapshot) => ({
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
      deadlineAt: new Date(started + 30 * 60 * 1000).toISOString(),
      completedAt: null,
    };
    dependencies.storage.save(state);
    return new ExamSession(state, dependencies);
  }

  static async restore(input: unknown, dependencies: Dependencies) {
    const state = recordSchema.parse(input);
    validatedBank(state.questions.map((question) => question.snapshot));
    const start = Date.parse(state.startedAt);
    const updated = Date.parse(state.updatedAt);
    const deadline = Date.parse(state.deadlineAt);
    if (
      updated < start ||
      deadline !== start + 30 * 60 * 1000 ||
      (state.status !== 'completed' && updated >= deadline) ||
      (state.status === 'completed') !== (state.completedAt !== null) ||
      (state.completedAt !== null &&
        (Date.parse(state.completedAt) < start ||
          Date.parse(state.completedAt) > updated ||
          Date.parse(state.completedAt) > deadline))
    )
      throw new Error('Invalid exam lifecycle timestamps.');
    if (
      domains.some(
        (domain) =>
          state.questions.filter(
            ({ snapshot }) => snapshot.domainId === domain.id,
          ).length !== 5,
      )
    )
      throw new Error('Invalid exam domain allocation.');
    for (const question of state.questions) {
      const { snapshot, selectedOptionIds, submittedAt, feedback } = question;
      if (
        question.revision !== (await revision(snapshot)) ||
        (snapshot.type === 'single' && selectedOptionIds.length > 1) ||
        new Set(selectedOptionIds).size !== selectedOptionIds.length ||
        selectedOptionIds.some(
          (id) => !snapshot.options.some((option) => option.id === id),
        )
      )
        throw new Error('Invalid exam snapshot or selection.');
      const expected =
        selectedOptionIds.length === snapshot.correctOptionIds.length &&
        selectedOptionIds.every((id) => snapshot.correctOptionIds.includes(id))
          ? 'correct'
          : 'incorrect';
      if (
        state.status === 'completed' && selectedOptionIds.length > 0
          ? submittedAt !== state.completedAt || feedback !== expected
          : submittedAt !== null || feedback !== null
      )
        throw new Error('Invalid exam submission or feedback.');
    }
    const restored = new ExamSession(structuredClone(state), dependencies);
    dependencies.storage.save(restored.state);
    restored.checkDeadline();
    return restored;
  }

  get record() {
    this.checkDeadline();
    return structuredClone(this.state);
  }

  remainingMilliseconds() {
    this.checkDeadline();
    return Math.max(
      0,
      Date.parse(this.state.deadlineAt) -
        (this.dependencies.clock ?? Date.now)(),
    );
  }

  private persist() {
    this.state.updatedAt = new Date(
      (this.dependencies.clock ?? Date.now)(),
    ).toISOString();
    this.dependencies.storage.save(this.state);
  }

  private active() {
    this.checkDeadline();
    if (this.state.status !== 'active')
      throw new Error('This exam is no longer active.');
  }

  select(optionIds: string[]) {
    this.active();
    const question = this.state.questions[this.state.currentIndex]!;
    if (
      (question.snapshot.type === 'single' && optionIds.length > 1) ||
      new Set(optionIds).size !== optionIds.length ||
      optionIds.some(
        (id) => !question.snapshot.options.some((option) => option.id === id),
      )
    )
      throw new Error('Select valid options without duplicates.');
    question.selectedOptionIds = [...optionIds];
    this.persist();
  }

  next() {
    this.active();
    if (this.state.currentIndex < this.state.questions.length - 1)
      this.state.currentIndex++;
    this.persist();
  }

  previous() {
    this.active();
    if (this.state.currentIndex > 0) this.state.currentIndex--;
    this.persist();
  }

  unansweredCount() {
    this.checkDeadline();
    return this.state.questions.filter(
      (question) => question.selectedOptionIds.length === 0,
    ).length;
  }

  submit() {
    if (this.state.status !== 'active') return;
    const completedAt = new Date(
      Math.min(
        (this.dependencies.clock ?? Date.now)(),
        Date.parse(this.state.deadlineAt),
      ),
    ).toISOString();
    for (const question of this.state.questions) {
      if (!question.selectedOptionIds.length) continue;
      question.submittedAt = completedAt;
      question.feedback =
        question.selectedOptionIds.length ===
          question.snapshot.correctOptionIds.length &&
        question.selectedOptionIds.every((id) =>
          question.snapshot.correctOptionIds.includes(id),
        )
          ? 'correct'
          : 'incorrect';
    }
    this.state.status = 'completed';
    this.state.completedAt = completedAt;
    this.persist();
  }

  checkDeadline() {
    if (
      this.state.status === 'active' &&
      (this.dependencies.clock ?? Date.now)() >=
        Date.parse(this.state.deadlineAt)
    )
      this.submit();
  }

  abandon() {
    this.active();
    this.state.status = 'abandoned';
    this.persist();
  }

  result() {
    this.checkDeadline();
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

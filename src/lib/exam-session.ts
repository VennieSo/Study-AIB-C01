import { z } from 'zod';
import { domains } from './exam-scope';
import { loadQuestionBanks, type Question } from './questions';
import { resultCounts } from './result-counts';
import type { Dependencies, SessionQuestion } from './session';

export const examPresets = [
  { questionCount: 20, durationMinutes: 30 },
  { questionCount: 40, durationMinutes: 65 },
  { questionCount: 60, durationMinutes: 95 },
  { questionCount: 85, durationMinutes: 130 },
] as const;

export type ExamQuestionCount = (typeof examPresets)[number]['questionCount'];

function presetFor(questionCount: ExamQuestionCount) {
  const preset = examPresets.find(
    (preset) => preset.questionCount === questionCount,
  );
  if (!preset) throw new Error('Choose an approved Exam preset.');
  return preset;
}

export interface ExamSessionRecord {
  schemaVersion: 1;
  id: string;
  mode: 'exam';
  configuration: {
    domainId: 'all';
    questionCount: ExamQuestionCount;
    durationMinutes: number;
  };
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
    questionCount: z.union([
      z.literal(20),
      z.literal(40),
      z.literal(60),
      z.literal(85),
    ]),
    durationMinutes: z.number().int().positive(),
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
    .min(20)
    .max(85),
  currentIndex: z.number().int().min(0).max(84),
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

function weightedAllocation(
  pool: readonly Question[],
  questionCount: ExamQuestionCount,
  random?: () => number,
) {
  // Shuffled priority breaks ties only among domains that can supply the extra question.
  const priority = random ? shuffle(domains, random) : [...domains];
  const allocations = priority
    .map((domain) => ({
      domainId: domain.id,
      name: domain.name,
      count: Math.floor((questionCount * domain.weight) / 100),
      remainder: (questionCount * domain.weight) % 100,
      capacity: pool.filter((question) => question.domainId === domain.id)
        .length,
    }))
    .sort((a, b) => b.remainder - a.remainder);
  const shortages = allocations.filter(
    (allocation) => allocation.capacity < allocation.count,
  );
  if (shortages.length)
    throw new Error(
      `Exam needs ${shortages.map((allocation) => `at least ${allocation.count} questions in ${allocation.name} (${allocation.domainId}); found ${allocation.capacity}`).join('. It also needs ')}.`,
    );
  let remaining =
    questionCount -
    allocations.reduce((sum, allocation) => sum + allocation.count, 0);
  for (const remainder of new Set(
    allocations.map((allocation) => allocation.remainder),
  )) {
    if (remaining === 0) break;
    const tied = allocations.filter(
      (allocation) => allocation.remainder === remainder,
    );
    const needed = Math.min(remaining, tied.length);
    const eligible = tied.filter(
      (allocation) => allocation.capacity > allocation.count,
    );
    if (eligible.length < needed)
      throw new Error(
        `Exam needs ${needed} additional questions across ${tied.map((allocation) => `${allocation.name} (${allocation.domainId})`).join('; ')} to support the ${questionCount}-question weighted allocation.`,
      );
    for (const allocation of eligible.slice(0, needed)) allocation.count++;
    remaining -= needed;
  }
  return allocations;
}

export function examAvailability(
  bank: readonly Question[],
  questionCount: ExamQuestionCount = 85,
) {
  presetFor(questionCount);
  const pool = validatedBank(bank);
  try {
    weightedAllocation(pool, questionCount);
    return {
      available: true,
      message: `${pool.length} questions available. ${questionCount} will be sampled across all domains.`,
    };
  } catch (cause) {
    return {
      available: false,
      message: `${pool.length} questions available. ${cause instanceof Error ? cause.message : 'Not enough questions for this preset.'}`,
    };
  }
}

export class ExamSession {
  private constructor(
    private state: ExamSessionRecord,
    private dependencies: Dependencies,
  ) {}

  static async start(
    bank: readonly Question[],
    dependencies: Dependencies,
    questionCount: ExamQuestionCount = 85,
  ) {
    const preset = presetFor(questionCount);
    const pool = validatedBank(bank);
    const random = dependencies.random ?? Math.random;
    const allocations = weightedAllocation(pool, questionCount, random);
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
        ...preset,
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
      deadlineAt: new Date(
        started + preset.durationMinutes * 60 * 1000,
      ).toISOString(),
      completedAt: null,
    };
    dependencies.storage.save(state);
    return new ExamSession(state, dependencies);
  }

  static async restore(input: unknown, dependencies: Dependencies) {
    const state = recordSchema.parse(input);
    const preset = presetFor(state.configuration.questionCount);
    if (
      state.configuration.durationMinutes !== preset.durationMinutes ||
      state.questions.length !== preset.questionCount ||
      state.currentIndex >= state.questions.length
    )
      throw new Error(
        'Invalid Exam preset, question count, or current position.',
      );
    validatedBank(state.questions.map((question) => question.snapshot));
    const start = Date.parse(state.startedAt);
    const updated = Date.parse(state.updatedAt);
    const deadline = Date.parse(state.deadlineAt);
    if (
      updated < start ||
      deadline !== start + preset.durationMinutes * 60 * 1000 ||
      (state.status !== 'completed' && updated >= deadline) ||
      (state.status === 'completed') !== (state.completedAt !== null) ||
      (state.completedAt !== null &&
        (Date.parse(state.completedAt) < start ||
          Date.parse(state.completedAt) > updated ||
          Date.parse(state.completedAt) > deadline))
    )
      throw new Error('Invalid exam lifecycle timestamps.');
    const allocation = domains.map((domain) => {
      const exact = (preset.questionCount * domain.weight) / 100;
      const count = state.questions.filter(
        ({ snapshot }) => snapshot.domainId === domain.id,
      ).length;
      return {
        count,
        floor: Math.floor(exact),
        remainder: (preset.questionCount * domain.weight) % 100,
      };
    });
    if (
      allocation.some(
        (item) =>
          item.count < item.floor ||
          item.count > item.floor + (item.remainder > 0 ? 1 : 0),
      ) ||
      allocation.some(
        (extra) =>
          extra.count > extra.floor &&
          allocation.some(
            (base) =>
              base.count === base.floor && base.remainder > extra.remainder,
          ),
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

  goTo(index: number) {
    this.active();
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.state.questions.length
    )
      throw new Error('Choose a valid question position.');
    this.state.currentIndex = index;
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
    return resultCounts(this.state.questions);
  }

  domainResults() {
    this.checkDeadline();
    if (this.state.status !== 'completed') return [];
    return domains.flatMap((domain) => {
      const questions = this.state.questions.filter(
        ({ snapshot }) => snapshot.domainId === domain.id,
      );
      return questions.length
        ? [{ domainId: domain.id, ...resultCounts(questions) }]
        : [];
    });
  }
}

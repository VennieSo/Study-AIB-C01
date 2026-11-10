import { expect, it } from 'vitest';
import {
  PracticeSession,
  MemorySessionStorage,
  type SessionRecord,
} from '../src/lib/session';
import { loadQuestionBanks } from '../src/lib/questions';
import { syntheticBank } from './fixtures/questions';

const bank = () => loadQuestionBanks({ 'domain-1': syntheticBank() });
const dependencies = () => ({
  storage: new MemorySessionStorage(),
  clock: () => Date.parse('2026-11-10T10:00:00.000Z'),
  random: () => 0.25,
  createId: () => 'test-session',
});

it('starts a ten-question domain session without repeats and snapshots the content', async () => {
  const questions = bank();
  const session = await PracticeSession.start(
    'domain-1',
    questions,
    dependencies(),
  );
  questions[0]!.text = 'changed bank';
  const record = session.record;
  expect(record.questions).toHaveLength(10);
  expect(
    new Set(record.questions.map(({ snapshot }) => snapshot.id)).size,
  ).toBe(10);
  expect(
    record.questions.every(
      ({ snapshot }) =>
        snapshot.domainId === 'domain-1' && snapshot.taskId === '1.1',
    ),
  ).toBe(true);
  expect(
    record.questions.some(({ snapshot }) => snapshot.text === 'changed bank'),
  ).toBe(false);
  expect(record).toMatchObject({
    schemaVersion: 1,
    mode: 'practice',
    status: 'active',
    currentIndex: 0,
    deadlineAt: null,
  });
});

it('requires submission, locks feedback, and completes with accurate raw counts', async () => {
  const deps = dependencies();
  const session = await PracticeSession.start('domain-1', bank(), deps);
  expect(() => session.next()).toThrow(/Submit/);
  expect(() => session.submit()).toThrow(/Select/);
  expect(() => session.select(['unknown'])).toThrow(/option/);
  for (let index = 0; index < 10; index++) {
    const question = session.record.questions[index]!.snapshot;
    const answer =
      index < 7
        ? question.correctOptionIds
        : [
            question.options.find(
              (option) => !question.correctOptionIds.includes(option.id),
            )!.id,
          ];
    session.select(answer);
    session.submit();
    expect(session.record.questions[index]!.feedback).toBe(
      index < 7 ? 'correct' : 'incorrect',
    );
    expect(() => session.select([question.options[0]!.id])).toThrow(/locked/);
    expect(() => session.submit()).toThrow(/locked/);
    session.next();
  }
  expect(session.record.status).toBe('completed');
  expect(session.result()).toEqual({
    total: 10,
    attempted: 10,
    correct: 7,
    incorrect: 3,
    unanswered: 0,
    percentage: 70,
  });
  expect(deps.storage.load('test-session')).toEqual(session.record);
  expect(() => session.next()).toThrow(/active/);
});

it('continues from validated JSON with selections, locked feedback, and original question revisions', async () => {
  const deps = dependencies();
  let session = await PracticeSession.start('domain-1', bank(), deps);
  session.select(session.record.questions[0]!.snapshot.correctOptionIds);
  session = await PracticeSession.restore(
    JSON.parse(JSON.stringify(session.record)),
    deps,
  );
  expect(session.record.questions[0]!.selectedOptionIds).toHaveLength(1);
  session.submit();
  const serialized = JSON.parse(JSON.stringify(session.record));
  session = await PracticeSession.restore(serialized, deps);
  expect(session.record).toEqual(serialized);
  expect(() => session.select([])).toThrow(/locked/);
  for (let index = 0; index < 10; index++) {
    if (index > 0) {
      session.select(
        session.record.questions[index]!.snapshot.correctOptionIds,
      );
      session.submit();
    }
    session.next();
  }
  const completed = await PracticeSession.restore(
    JSON.parse(JSON.stringify(session.record)),
    deps,
  );
  expect(completed.result().percentage).toBe(100);
  expect(completed.record.completedAt).toBe('2026-11-10T10:00:00.000Z');
});

it('reports insufficient content and samples a different order for a different random source', async () => {
  await expect(
    PracticeSession.start('domain-2', bank(), dependencies()),
  ).rejects.toThrow(/at least 10/);
  await expect(
    PracticeSession.start('domain-1', bank().slice(0, 9), dependencies()),
  ).rejects.toThrow(/at least 10/);
  const first = await PracticeSession.start('domain-1', bank(), dependencies());
  const second = await PracticeSession.start('domain-1', bank(), {
    ...dependencies(),
    random: () => 0.75,
  });
  expect(first.record.questions.map(({ snapshot }) => snapshot.id)).not.toEqual(
    second.record.questions.map(({ snapshot }) => snapshot.id),
  );
});

it('keeps defensive storage copies and retains an abandoned session', async () => {
  const deps = dependencies();
  const session = await PracticeSession.start('domain-1', bank(), deps);
  deps.storage.load('test-session')!.questions[0]!.snapshot.text =
    'changed copy';
  session.record.questions[0]!.selectedOptionIds.push('changed copy');
  expect(session.record.questions[0]!.selectedOptionIds).toEqual([]);
  expect(
    deps.storage.load('test-session')!.questions[0]!.snapshot.text,
  ).not.toBe('changed copy');
  session.abandon();
  expect(deps.storage.load('test-session')!.status).toBe('abandoned');
  expect(session.result()).toMatchObject({
    attempted: 0,
    incorrect: 0,
    unanswered: 10,
  });
  expect(() => session.submit()).toThrow(/active/);
});

it.each<[string, (record: SessionRecord) => void]>([
  [
    'version',
    (record) => {
      Object.assign(record, { schemaVersion: 2 });
    },
  ],
  [
    'snapshot revision',
    (record) => {
      record.questions[0]!.snapshot.text = 'changed revision';
    },
  ],
  [
    'unknown answer',
    (record) => {
      record.questions[0]!.selectedOptionIds = ['missing'];
    },
  ],
  [
    'forged feedback',
    (record) => {
      record.questions[0]!.feedback = 'correct';
    },
  ],
  [
    'skipped feedback',
    (record) => {
      record.currentIndex = 1;
    },
  ],
  [
    'future selection',
    (record) => {
      record.questions[1]!.selectedOptionIds = ['option-1'];
    },
  ],
  [
    'premature completion',
    (record) => {
      record.status = 'completed';
    },
  ],
  [
    'invalid timestamp',
    (record) => {
      record.updatedAt = 'yesterday';
    },
  ],
  [
    'reversed timestamps',
    (record) => {
      record.updatedAt = '2026-11-09T10:00:00.000Z';
    },
  ],
  [
    'practice deadline',
    (record) => {
      record.deadlineAt = '2026-11-10T11:00:00.000Z';
    },
  ],
])('rejects an invalid serialized record: %s', async (_, mutate) => {
  const session = await PracticeSession.start(
    'domain-1',
    bank(),
    dependencies(),
  );
  const record = session.record;
  mutate(record);
  await expect(
    PracticeSession.restore(record, dependencies()),
  ).rejects.toThrow();
});

it('admits multiple-response questions and scores one selected correct option as incorrect', async () => {
  const questions = loadQuestionBanks({
    'domain-1': syntheticBank(12, 'multiple'),
  });
  const session = await PracticeSession.start(
    'domain-1',
    questions,
    dependencies(),
  );
  expect(session.record.questions[0]!.snapshot).toMatchObject({
    type: 'multiple',
    domainId: 'domain-1',
    taskId: '1.1',
  });
  session.select(['option-1']);
  session.submit();
  expect(session.record.questions[0]!.feedback).toBe('incorrect');
});

it.each([
  ['one', ['option-1'], 'incorrect'],
  ['too few', ['option-1', 'option-3'], 'incorrect'],
  ['too many', ['option-1', 'option-2', 'option-3', 'option-5'], 'incorrect'],
  [
    'all',
    ['option-1', 'option-2', 'option-3', 'option-4', 'option-5', 'option-6'],
    'incorrect',
  ],
  ['same-sized incorrect', ['option-1', 'option-2', 'option-3'], 'incorrect'],
  [
    'exact correct set in different order',
    ['option-5', 'option-1', 'option-3'],
    'correct',
  ],
])(
  'submits %s multiple-response selections, restores feedback, and counts exact-set credit',
  async (_, selected, feedback) => {
    const deps = dependencies();
    let session = await PracticeSession.start(
      'domain-1',
      loadQuestionBanks({ 'domain-1': syntheticBank(12, 'multiple') }),
      deps,
    );
    session.select(selected as string[]);
    expect(session.record.questions[0]!.submittedAt).toBeNull();
    expect(() => session.next()).toThrow(/Submit/);
    session = await PracticeSession.restore(
      JSON.parse(JSON.stringify(session.record)),
      deps,
    );
    expect(session.record.questions[0]!.selectedOptionIds).toEqual(selected);
    session.submit();
    expect(session.record.questions[0]!.feedback).toBe(feedback);
    session = await PracticeSession.restore(
      JSON.parse(JSON.stringify(session.record)),
      deps,
    );
    expect(() => session.select([])).toThrow(/locked/);
    expect(() => session.submit()).toThrow(/locked/);
    session.next();
    for (let index = 1; index < 10; index++) {
      session.select(
        session.record.questions[index]!.snapshot.correctOptionIds,
      );
      session.submit();
      session.next();
    }
    session = await PracticeSession.restore(
      JSON.parse(JSON.stringify(session.record)),
      deps,
    );
    expect(session.record.status).toBe('completed');
    expect(session.result()).toEqual({
      total: 10,
      attempted: 10,
      correct: feedback === 'correct' ? 10 : 9,
      incorrect: feedback === 'correct' ? 0 : 1,
      unanswered: 0,
      percentage: feedback === 'correct' ? 100 : 90,
    });
    expect(deps.storage.load('test-session')).toEqual(session.record);
  },
);

it('keeps an empty multiple-response answer on the current question until explicit submission', async () => {
  const session = await PracticeSession.start(
    'domain-1',
    loadQuestionBanks({ 'domain-1': syntheticBank(12, 'multiple') }),
    dependencies(),
  );
  session.select(['option-1']);
  session.select([]);
  expect(() => session.submit()).toThrow('Select an answer before submitting.');
  expect(() => session.next()).toThrow(/Submit/);
  expect(session.record).toMatchObject({ status: 'active', currentIndex: 0 });
  expect(session.record.questions[0]).toMatchObject({
    selectedOptionIds: [],
    submittedAt: null,
    feedback: null,
  });
  expect(session.result()).toMatchObject({
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 10,
  });
});

it('rejects duplicated or unknown selections and forged partial-credit feedback in multiple-response records', async () => {
  const session = await PracticeSession.start(
    'domain-1',
    loadQuestionBanks({ 'domain-1': syntheticBank(12, 'multiple') }),
    dependencies(),
  );
  expect(() => session.select(['option-1', 'option-1'])).toThrow(/option/);
  expect(() => session.select(['option-1', 'unknown'])).toThrow(/option/);
  const duplicate = session.record;
  duplicate.questions[0]!.selectedOptionIds = ['option-1', 'option-1'];
  await expect(
    PracticeSession.restore(duplicate, dependencies()),
  ).rejects.toThrow();
  session.select(['option-1', 'option-3']);
  session.submit();
  const forged = session.record;
  forged.questions[0]!.feedback = 'correct';
  await expect(PracticeSession.restore(forged, dependencies())).rejects.toThrow(
    /feedback/,
  );
});

it('retains the single-answer selection limit in live and restored sessions', async () => {
  const session = await PracticeSession.start(
    'domain-1',
    bank(),
    dependencies(),
  );
  expect(() => session.select(['option-1', 'option-2'])).toThrow(/one/);
  const record = session.record;
  record.questions[0]!.selectedOptionIds = ['option-1', 'option-2'];
  await expect(
    PracticeSession.restore(record, dependencies()),
  ).rejects.toThrow();
});

it('samples every approved Practice scope and size without repeats and restores its configuration', async () => {
  const { syntheticBanks } = await import('./fixtures/questions');
  const questions = loadQuestionBanks(syntheticBanks());
  for (const scope of [
    'domain-1',
    'domain-2',
    'domain-3',
    'domain-4',
    'all',
  ] as const) {
    for (const count of scope === 'all' ? [20, 40, 60, 85] : [10, 15, 20, 25]) {
      const session = await PracticeSession.start(
        scope,
        questions,
        dependencies(),
        count,
      );
      expect(session.record.configuration).toEqual({
        domainId: scope,
        questionCount: count,
      });
      expect(session.record.questions).toHaveLength(count);
      expect(
        new Set(session.record.questions.map(({ snapshot }) => snapshot.id))
          .size,
      ).toBe(count);
      if (scope !== 'all')
        expect(
          session.record.questions.every(
            ({ snapshot }) => snapshot.domainId === scope,
          ),
        ).toBe(true);
      const restored = await PracticeSession.restore(
        JSON.parse(JSON.stringify(session.record)),
        dependencies(),
      );
      expect(restored.record).toEqual(session.record);
      for (let index = 0; index < count; index++) {
        restored.select(
          restored.record.questions[index]!.snapshot.correctOptionIds,
        );
        restored.submit();
        restored.next();
      }
      const completed = await PracticeSession.restore(
        JSON.parse(JSON.stringify(restored.record)),
        dependencies(),
      );
      expect(completed.record.status).toBe('completed');
      expect(completed.result()).toMatchObject({
        total: count,
        correct: count,
        percentage: 100,
      });
    }
  }
});

it('uses the full unweighted pool, preserves answers, and reports participating domain performance', async () => {
  const { syntheticBanks } = await import('./fixtures/questions');
  const questions = loadQuestionBanks(syntheticBanks());
  const session = await PracticeSession.start(
    'all',
    questions,
    { ...dependencies(), random: () => 0.999 },
    40,
  );
  expect(
    session.record.questions
      .slice(0, 25)
      .every(({ snapshot }) => snapshot.domainId === 'domain-1'),
  ).toBe(true);
  expect(session.record.questions[25]!.snapshot.domainId).toBe('domain-2');
  const original = session.record.questions[0]!.snapshot.text;
  questions[0]!.text = 'new bank revision';
  for (let index = 0; index < 40; index++) {
    const snapshot = session.record.questions[index]!.snapshot;
    session.select(
      index < 30
        ? snapshot.correctOptionIds
        : [
            snapshot.options.find(
              (option) => !snapshot.correctOptionIds.includes(option.id),
            )!.id,
          ],
    );
    session.submit();
    session.next();
  }
  const restored = await PracticeSession.restore(
    JSON.parse(JSON.stringify(session.record)),
    dependencies(),
  );
  expect(restored.record.questions[0]!.snapshot.text).toBe(original);
  expect(restored.record.questions[0]!.selectedOptionIds).toEqual(['option-1']);
  expect(restored.result()).toMatchObject({
    total: 40,
    attempted: 40,
    correct: 30,
    incorrect: 10,
    unanswered: 0,
    percentage: 75,
  });
  expect(restored.domainResults()).toEqual([
    {
      domainId: 'domain-1',
      total: 25,
      attempted: 25,
      correct: 25,
      incorrect: 0,
      unanswered: 0,
      percentage: 100,
    },
    {
      domainId: 'domain-2',
      total: 15,
      attempted: 15,
      correct: 5,
      incorrect: 10,
      unanswered: 0,
      percentage: expect.closeTo(33.333333, 5),
    },
  ]);
});

it('rejects unsupported configurations and refuses to repeat or silently shorten reduced pools', async () => {
  const { syntheticBanks } = await import('./fixtures/questions');
  const questions = loadQuestionBanks(syntheticBanks(16));
  await expect(
    PracticeSession.start('domain-3', questions, dependencies(), 20),
  ).rejects.toThrow(/20 questions; 16 available/);
  await expect(
    PracticeSession.start('all', questions, dependencies(), 85),
  ).rejects.toThrow(/85 questions; 64 available/);
  await expect(
    PracticeSession.start('all', questions, dependencies(), 10),
  ).rejects.toThrow(/approved/);
  await expect(
    PracticeSession.start('domain-1', questions, dependencies(), 85),
  ).rejects.toThrow(/approved/);
  const session = await PracticeSession.start(
    'all',
    questions,
    dependencies(),
    60,
  );
  expect(session.record.questions).toHaveLength(60);
  for (const mutate of [
    (record: SessionRecord) => {
      record.configuration.questionCount = 20;
    },
    (record: SessionRecord) => {
      record.configuration.domainId = 'domain-1';
    },
    (record: SessionRecord) => {
      record.currentIndex = 60;
    },
    (record: SessionRecord) => {
      record.questions[1] = record.questions[0]!;
    },
  ]) {
    const record = session.record;
    mutate(record);
    await expect(
      PracticeSession.restore(record, dependencies()),
    ).rejects.toThrow();
  }
});

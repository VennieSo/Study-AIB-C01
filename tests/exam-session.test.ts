import { expect, it } from 'vitest';
import { ExamSession, examAvailability } from '../src/lib/exam-session';
import { MemorySessionStorage } from '../src/lib/session';
import { loadQuestionBanks } from '../src/lib/questions';
import { domains } from '../src/lib/exam-scope';
import { syntheticBank } from './fixtures/questions';

function bank(count = 25) {
  return loadQuestionBanks(
    Object.fromEntries(
      domains.map((domain) => [
        domain.id,
        {
          schemaVersion: 1,
          questions: syntheticBank(count, 'mixed').questions.map(
            (question) => ({
              ...question,
              id: `${domain.id}-${question.id}`,
              domainId: domain.id,
              taskId: `${domain.number}.1`,
            }),
          ),
        },
      ]),
    ),
  );
}

function dependencies() {
  let now = Date.parse('2026-11-10T10:00:00.000Z');
  return {
    storage: new MemorySessionStorage(),
    clock: () => now,
    random: () => 0.999,
    createId: () => 'exam-test',
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

function startTwenty(
  questions: Parameters<typeof ExamSession.start>[0],
  deps: Parameters<typeof ExamSession.start>[1],
) {
  return ExamSession.start(questions, deps, 20);
}

it('defaults to a full eighty-five-question exam with a 130-minute deadline', async () => {
  const session = await ExamSession.start(bank(), dependencies());
  expect(session.record.configuration).toEqual({
    domainId: 'all',
    questionCount: 85,
    durationMinutes: 130,
  });
  expect(session.record.questions).toHaveLength(85);
  expect(session.record.deadlineAt).toBe('2026-11-10T12:10:00.000Z');
});

it('starts a weighted twenty-question exam with unique snapshots and an absolute thirty-minute deadline', async () => {
  const source = bank();
  const session = await startTwenty(source, dependencies());
  source[0]!.text = 'changed bank';
  const record = session.record;
  expect(record).toMatchObject({
    schemaVersion: 1,
    mode: 'exam',
    status: 'active',
    configuration: { domainId: 'all', questionCount: 20, durationMinutes: 30 },
    startedAt: '2026-11-10T10:00:00.000Z',
    deadlineAt: '2026-11-10T10:30:00.000Z',
  });
  expect(record.questions).toHaveLength(20);
  expect(
    new Set(record.questions.map(({ snapshot }) => snapshot.id)).size,
  ).toBe(20);
  expect(
    domains.map(
      (domain) =>
        record.questions.filter(
          ({ snapshot }) => snapshot.domainId === domain.id,
        ).length,
    ),
  ).toEqual([5, 5, 5, 5]);
  expect(
    record.questions.every(
      ({ snapshot, revision }) =>
        snapshot.taskId &&
        revision.length === 64 &&
        snapshot.text !== 'changed bank',
    ),
  ).toBe(true);
  expect(session.remainingMilliseconds()).toBe(30 * 60 * 1000);
});

it('retains revisable and cleared answers across skipped questions and finalizes exact-set scoring once', async () => {
  const deps = dependencies();
  const session = await startTwenty(bank(), deps);
  session.select(session.record.questions[0]!.snapshot.correctOptionIds);
  session.next();
  session.next();
  session.previous();
  const multiple = session.record.questions[1]!.snapshot;
  expect(multiple.type).toBe('multiple');
  session.select(multiple.options.map((option) => option.id));
  session.previous();
  expect(session.record.questions[0]!.selectedOptionIds).toEqual(
    session.record.questions[0]!.snapshot.correctOptionIds,
  );
  session.select([]);
  session.select(session.record.questions[0]!.snapshot.correctOptionIds);
  expect(session.unansweredCount()).toBe(18);
  expect(
    session.record.questions.every((question) => question.feedback === null),
  ).toBe(true);
  session.submit();
  expect(session.result()).toEqual({
    total: 20,
    attempted: 2,
    correct: 1,
    incorrect: 1,
    unanswered: 18,
    percentage: 5,
  });
  const completed = session.record;
  deps.advance(60_000);
  session.submit();
  expect(session.record).toEqual(completed);
  expect(deps.storage.load('exam-test')).toEqual(completed);
  expect(() => session.select([])).toThrow(/active/);
  expect(() => session.next()).toThrow(/active/);
});

it('finalizes retained answers on delayed execution and rejects an edit at the deadline', async () => {
  const deps = dependencies();
  const session = await startTwenty(bank(), deps);
  session.select(session.record.questions[0]!.snapshot.correctOptionIds);
  deps.advance(30 * 60 * 1000);
  expect(() => session.select([])).toThrow(/active/);
  expect(session.record.status).toBe('completed');
  expect(session.result()).toMatchObject({
    attempted: 1,
    correct: 1,
    unanswered: 19,
    percentage: 5,
  });
  expect(session.remainingMilliseconds()).toBe(0);
  const completed = session.record;
  deps.advance(15 * 60 * 1000);
  session.checkDeadline();
  session.submit();
  expect(session.record).toEqual(completed);

  const suspendedDeps = dependencies();
  const suspended = await startTwenty(bank(), suspendedDeps);
  suspendedDeps.advance(45 * 60 * 1000);
  suspended.checkDeadline();
  expect(suspended.record).toMatchObject({
    status: 'completed',
    completedAt: '2026-11-10T10:30:00.000Z',
  });
  expect(suspended.result()).toMatchObject({
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 20,
    percentage: 0,
  });
});

it('reconstructs records with navigation and selections while retaining the original deadline', async () => {
  const deps = dependencies();
  let session = await startTwenty(bank(), deps);
  session.select(session.record.questions[0]!.snapshot.correctOptionIds);
  session.next();
  session.select(['option-1', 'option-3']);
  deps.advance(12 * 60 * 1000);
  const record = JSON.parse(JSON.stringify(session.record));
  session = await ExamSession.restore(record, deps);
  expect(session.record).toEqual(record);
  expect(session.remainingMilliseconds()).toBe(18 * 60 * 1000);
  session.previous();
  expect(session.record.questions[0]!.selectedOptionIds).toHaveLength(1);
  deps.advance(20 * 60 * 1000);
  session = await ExamSession.restore(record, deps);
  expect(session.record.deadlineAt).toBe('2026-11-10T10:30:00.000Z');
  expect(session.result()).toMatchObject({
    attempted: 2,
    correct: 1,
    incorrect: 1,
    unanswered: 18,
  });
  const completed = session.record;
  expect(
    (await ExamSession.restore(JSON.parse(JSON.stringify(completed)), deps))
      .record,
  ).toEqual(completed);
});

it('reports finalized per-domain totals with incorrect answers separate from unanswered questions', async () => {
  const session = await ExamSession.start(bank(), dependencies());
  expect(session.domainResults()).toEqual([]);
  session.select(['option-1']);
  session.next();
  session.select(['option-1', 'option-3']);
  session.submit();
  expect(session.domainResults()).toEqual([
    {
      domainId: 'domain-1',
      total: 5,
      attempted: 2,
      correct: 1,
      incorrect: 1,
      unanswered: 3,
      percentage: 20,
    },
    {
      domainId: 'domain-2',
      total: 5,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 5,
      percentage: 0,
    },
    {
      domainId: 'domain-3',
      total: 5,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 5,
      percentage: 0,
    },
    {
      domainId: 'domain-4',
      total: 5,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 5,
      percentage: 0,
    },
  ]);
});

it('retains completed answer and content snapshots independently of reloaded banks and edited copies', async () => {
  const source = bank();
  const deps = dependencies();
  const session = await ExamSession.start(source, deps);
  session.select(['option-1']);
  session.next();
  session.select(['option-5', 'option-1']);
  session.submit();
  const completed = session.record;
  const results = {
    session: session.result(),
    domains: session.domainResults(),
  };

  source[0]!.text = 'Updated synthetic question';
  source[0]!.taskId = '1.2';
  source[0]!.options[0]!.text = 'Updated synthetic option';
  source[0]!.correctOptionIds = ['option-2'];
  source[0]!.explanation = 'Updated synthetic explanation';
  source[0]!.references = [];
  const reloaded = await ExamSession.start(source, {
    ...dependencies(),
    createId: () => 'another-exam',
  });
  expect(reloaded.record.questions[0]!.snapshot.text).toBe(
    'Updated synthetic question',
  );

  const editableCopy = session.record;
  editableCopy.questions[0]!.snapshot.text = 'Edited result copy';
  editableCopy.questions[1]!.selectedOptionIds = [
    'option-1',
    'option-3',
    'option-5',
  ];
  const storedCopy = deps.storage.load('exam-test')!;
  storedCopy.questions[0]!.snapshot.explanation = 'Edited storage copy';
  const restored = await ExamSession.restore(
    JSON.parse(JSON.stringify(completed)),
    dependencies(),
  );
  expect(session.record).toEqual(completed);
  expect(restored.record).toEqual(completed);
  expect(restored.record.questions[0]!.snapshot).toMatchObject({
    taskId: '1.1',
    correctOptionIds: ['option-1'],
    references: [{ title: 'AWS exam guide (synthetic reference link check)' }],
  });
  expect(restored.record.questions[1]!.selectedOptionIds).toEqual([
    'option-5',
    'option-1',
  ]);
  expect({
    session: restored.result(),
    domains: restored.domainResults(),
  }).toEqual(results);
  expect(() => restored.select(['option-2'])).toThrow(/active/);
  expect(() => restored.previous()).toThrow(/active/);
  restored.submit();
  expect(restored.record).toEqual(completed);
});

it.each([
  ['partial', ['option-1', 'option-3'], 1],
  ['over-selected', ['option-1', 'option-2', 'option-3', 'option-5'], 1],
  [
    'all',
    ['option-1', 'option-2', 'option-3', 'option-4', 'option-5', 'option-6'],
    1,
  ],
  ['exact in reverse order', ['option-5', 'option-3', 'option-1'], 0],
  ['cleared', [], 0],
])(
  'accepts %s multiple-response sets and counts empty selections separately',
  async (_, selected, incorrect) => {
    const deps = dependencies();
    const session = await startTwenty(bank(), deps);
    session.next();
    session.select(['option-1']);
    session.select(selected as string[]);
    session.next();
    session.previous();
    expect(session.record.questions[1]!.selectedOptionIds).toEqual(selected);
    session.submit();
    expect(session.result()).toMatchObject({
      attempted: selected.length ? 1 : 0,
      correct: selected.length && !incorrect ? 1 : 0,
      incorrect,
      unanswered: selected.length ? 19 : 20,
    });
  },
);

it('rejects insufficient actual domain capacity rather than shortening or repeating questions', async () => {
  const questions = bank();
  const skewed = questions
    .filter((question) => question.domainId !== 'domain-4')
    .concat(
      questions
        .filter((question) => question.domainId === 'domain-4')
        .slice(0, 4),
    );
  await expect(startTwenty(skewed, dependencies())).rejects.toThrow(/domain-4/);
  await expect(startTwenty(bank(4), dependencies())).rejects.toThrow(/needs/);
});

it('keeps weighted totals and no repeats across different random orders', async () => {
  const orders = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    let state = seed;
    const session = await startTwenty(bank(), {
      ...dependencies(),
      random: () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 2 ** 32;
      },
    });
    const questions = session.record.questions;
    expect(questions).toHaveLength(20);
    expect(new Set(questions.map(({ snapshot }) => snapshot.id)).size).toBe(20);
    expect(
      domains.map(
        (domain) =>
          questions.filter(({ snapshot }) => snapshot.domainId === domain.id)
            .length,
      ),
    ).toEqual([5, 5, 5, 5]);
    orders.add(questions.map(({ snapshot }) => snapshot.id).join(','));
  }
  expect(orders.size).toBe(20);
});

it.each([
  [
    'unpaired duration',
    (record: any) => {
      record.configuration.durationMinutes = 65;
    },
  ],
  [
    'mismatched preset count',
    (record: any) => {
      record.configuration = {
        domainId: 'all',
        questionCount: 40,
        durationMinutes: 65,
      };
    },
  ],
  [
    'position past the preset',
    (record: any) => {
      record.currentIndex = 20;
    },
  ],
  [
    'domain',
    (record: any) => {
      record.questions[0].snapshot.domainId = 'domain-9';
    },
  ],
  [
    'task',
    (record: any) => {
      record.questions[0].snapshot.taskId = '2.1';
    },
  ],
  [
    'revision',
    (record: any) => {
      record.questions[0].snapshot.text = 'changed';
    },
  ],
  [
    'duplicate',
    (record: any) => {
      record.questions[1] = structuredClone(record.questions[0]);
    },
  ],
  [
    'selection',
    (record: any) => {
      record.questions[0].selectedOptionIds = ['unknown'];
    },
  ],
  [
    'feedback',
    (record: any) => {
      record.questions[0].feedback = 'correct';
    },
  ],
  [
    'deadline extension',
    (record: any) => {
      record.deadlineAt = '2026-11-10T11:00:00.000Z';
    },
  ],
  [
    'completion',
    (record: any) => {
      record.status = 'completed';
    },
  ],
])('rejects forged Exam records: %s', async (_, mutate) => {
  const session = await startTwenty(bank(), dependencies());
  const record = session.record;
  mutate(record);
  await expect(ExamSession.restore(record, dependencies())).rejects.toThrow();
});

it.each([
  [20, [5, 5, 5, 5]],
  [40, [9, 11, 10, 10]],
  [60, [14, 17, 14, 15]],
  [85, [20, 24, 20, 21]],
] as const)(
  'starts preset %i whenever actual capacity supports a valid weighted allocation',
  async (count, capacities) => {
    const reduced = bank().filter((question) => {
      const index = domains.findIndex(
        (domain) => domain.id === question.domainId,
      );
      return Number(question.id.split('-').at(-1)) <= capacities[index]!;
    });
    expect(examAvailability(reduced, count).available).toBe(true);
    for (const random of [() => 0, () => 0.999]) {
      const session = await ExamSession.start(
        reduced,
        { ...dependencies(), random },
        count,
      );
      expect(
        domains.map(
          (domain) =>
            session.record.questions.filter(
              ({ snapshot }) => snapshot.domainId === domain.id,
            ).length,
        ),
      ).toEqual(capacities);
      expect(
        new Set(session.record.questions.map(({ snapshot }) => snapshot.id))
          .size,
      ).toBe(count);
      const insufficient = reduced.filter(
        (question) => question.id !== session.record.questions[0]!.snapshot.id,
      );
      expect(examAvailability(insufficient, count).available).toBe(false);
      await expect(
        ExamSession.start(insufficient, dependencies(), count),
      ).rejects.toThrow(/needs/);
    }
  },
);

it.each([
  [20, 30, [5, 5, 5, 5]],
  [40, 65, [10, 11, 10, 9]],
  [60, 95, [15, 17, 14, 14]],
  [85, 130, [21, 24, 20, 20]],
] as const)(
  'retains preset %i, direct navigation, unrestricted selections, and the deadline through reconstruction and expiry',
  async (count, minutes, allocation) => {
    const deps = dependencies();
    let session = await ExamSession.start(bank(), deps, count);
    expect(
      domains.map(
        (domain) =>
          session.record.questions.filter(
            ({ snapshot }) => snapshot.domainId === domain.id,
          ).length,
      ),
    ).toEqual(allocation);
    expect(
      new Set(session.record.questions.map(({ snapshot }) => snapshot.id)).size,
    ).toBe(count);
    const deadline = session.record.deadlineAt;
    const first = session.record.questions[0]!.snapshot;
    session.select(first.correctOptionIds);
    const multipleIndex = session.record.questions.findIndex(
      ({ snapshot }) => snapshot.type === 'multiple',
    );
    session.goTo(multipleIndex);
    const multiple = session.record.questions[multipleIndex]!.snapshot;
    session.select([multiple.options[0]!.id]);
    expect(session.unansweredCount()).toBe(count - 2);
    session.select(multiple.options.map((option) => option.id));
    session.goTo(count - 1);
    expect(session.record.questions[count - 1]!.selectedOptionIds).toEqual([]);
    session.goTo(multipleIndex);
    expect(
      session.record.questions[multipleIndex]!.selectedOptionIds,
    ).toHaveLength(6);
    session.select([]);
    expect(session.unansweredCount()).toBe(count - 1);
    session.select(multiple.options.map((option) => option.id));
    deps.advance(60_000);
    const saved = JSON.parse(JSON.stringify(session.record));
    session = await ExamSession.restore(saved, deps);
    expect(session.record).toEqual(saved);
    expect(session.record.configuration).toEqual({
      domainId: 'all',
      questionCount: count,
      durationMinutes: minutes,
    });
    expect(session.remainingMilliseconds()).toBe((minutes - 1) * 60_000);
    session.goTo(0);
    expect(session.record.questions[0]!.selectedOptionIds).toEqual(
      first.correctOptionIds,
    );
    for (const invalid of [-1, count, 0.5, NaN])
      expect(() => session.goTo(invalid)).toThrow(/position/);
    expect(session.record.currentIndex).toBe(0);
    expect(session.record.deadlineAt).toBe(deadline);
    deps.advance((minutes + 10) * 60_000);
    expect(() => session.goTo(1)).toThrow(/active/);
    expect(session.result()).toEqual({
      total: count,
      attempted: 2,
      correct: 1,
      incorrect: 1,
      unanswered: count - 2,
      percentage: 100 / count,
    });
    expect(session.record.completedAt).toBe(deadline);
    const completed = session.record;
    session.submit();
    expect(session.record).toEqual(completed);
  },
);

it.each([40, 60, 85] as const)(
  'randomly breaks weighted remainder ties for preset %i without changing higher-priority quotas',
  async (count) => {
    const allocations = new Set<string>();
    const allowed =
      count === 40
        ? ['10,11,10,9', '10,11,9,10', '9,11,10,10']
        : count === 60
          ? ['15,17,14,14', '14,17,15,14', '14,17,14,15']
          : ['21,24,20,20', '20,24,21,20', '20,24,20,21'];
    for (const value of [0, 0.25, 0.5, 0.999]) {
      const session = await ExamSession.start(
        bank(),
        { ...dependencies(), random: () => value },
        count,
      );
      const allocation = domains
        .map(
          (domain) =>
            session.record.questions.filter(
              ({ snapshot }) => snapshot.domainId === domain.id,
            ).length,
        )
        .join(',');
      expect(allowed).toContain(allocation);
      allocations.add(allocation);
    }
    expect(allocations.size).toBe(3);
  },
);

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

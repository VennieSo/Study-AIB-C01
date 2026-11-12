import { describe, expect, it } from 'vitest';
import schema from '../docs/agents/question-bank.schema.json';
import { domains, getDomain, getSkill, skills } from '../src/lib/exam-scope';
import { loadQuestionBanks, validateLaunchCounts } from '../src/lib/questions';
import { publicBanks } from '../src/data/public-banks';
import { PracticeSession, MemorySessionStorage } from '../src/lib/session';
import { ExamSession } from '../src/lib/exam-session';
import { syntheticBank, syntheticBanks } from './fixtures/questions';

it('keeps the schema and official registry in agreement for every skill and task', () => {
  expect(skills).toHaveLength(58);
  expect(new Set(skills.map(({ id }) => id)).size).toBe(skills.length);
  expect(schema.$defs.question.properties.skillId.enum).toEqual(
    skills.map(({ id }) => id),
  );
  for (const domain of domains) {
    const domainSkills = skills.filter((skill) => skill.domainId === domain.id);
    expect(new Set(domainSkills.map(({ taskId }) => taskId))).toEqual(
      new Set(Object.keys(domain.tasks)),
    );
    for (const skill of domainSkills) {
      expect(skill.description.trim()).not.toBe('');
      expect(skill.taskId in getDomain(skill.domainId).tasks).toBe(true);
      expect(skill.sourceUrl).toBe(
        `https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain${domain.number}.html`,
      );
      const rule = schema.$defs.question.allOf.find(
        (rule) =>
          'taskId' in rule.if.properties &&
          rule.if.properties.taskId.const === skill.taskId,
      );
      expect(rule?.then.properties).toMatchObject({
        skillId: {
          enum: skills
            .filter(({ taskId }) => taskId === skill.taskId)
            .map(({ id }) => id),
        },
      });
      const bank = syntheticBank(1);
      Object.assign(bank.questions[0]!, {
        domainId: skill.domainId,
        taskId: skill.taskId,
        skillId: skill.id,
      });
      expect(loadQuestionBanks({ [domain.id]: bank })[0]!.skillId).toBe(
        skill.id,
      );
    }
  }
  expect(getSkill('1.1.99')).toBeUndefined();
});

it.each([
  ['missing', undefined],
  ['blank', ' '],
  ['unknown but correctly formatted', '1.1.99'],
  ['wrong task', '1.2.1'],
  ['wrong domain', '2.1.1'],
  ['multiple primary skills', ['1.1.1', '1.1.2']],
])('rejects %s primary skills', (_, skillId) => {
  const bank = syntheticBank(1);
  Object.assign(bank.questions[0]!, { skillId });
  expect(() => loadQuestionBanks({ 'domain-1': bank })).toThrow(
    /skillId|skill/,
  );
});

it('rejects version-1 banks, including empty banks, without inferring classifications', () => {
  for (const count of [0, 1]) {
    const bank = syntheticBank(count);
    bank.schemaVersion = 1;
    expect(() => loadQuestionBanks({ 'domain-1': bank })).toThrow(
      /Unsupported.*version 1.*schemaVersion 2.*explicitly assign.*skillId/,
    );
  }
});

it('keeps all production wrappers empty at version 2 and fixtures separate with full skill coverage', () => {
  expect(Object.values(publicBanks)).toHaveLength(4);
  for (const bank of Object.values(publicBanks))
    expect(bank).toEqual({ schemaVersion: 2, questions: [] });
  expect(loadQuestionBanks(publicBanks)).toEqual([]);
  const fixtures = loadQuestionBanks(syntheticBanks());
  expect(() => validateLaunchCounts(fixtures)).not.toThrow();
  expect(new Set(fixtures.map(({ skillId }) => skillId))).toEqual(
    new Set(skills.map(({ id }) => id)),
  );
  expect(fixtures.every(({ id }) => id.includes('synthetic-'))).toBe(true);
});

for (const mode of ['practice', 'exam'] as const) {
  describe(`${mode} skill snapshots`, () => {
    const dependencies = () => ({
      storage: new MemorySessionStorage(),
      clock: () => Date.parse('2026-11-12T00:00:00Z'),
      random: () => 0.5,
    });
    const start = (
      bank: ReturnType<typeof loadQuestionBanks>,
      deps = dependencies(),
    ) =>
      mode === 'practice'
        ? PracticeSession.start('all', bank, deps, 20)
        : ExamSession.start(bank, deps, 20);
    const restore = (record: unknown) =>
      mode === 'practice'
        ? PracticeSession.restore(record, dependencies())
        : ExamSession.restore(record, dependencies());

    it('preserves primary skills through defensive snapshots and JSON reconstruction', async () => {
      const bank = loadQuestionBanks(syntheticBanks());
      const session = await start(bank);
      const original = session.record;
      for (const { snapshot } of original.questions)
        expect(snapshot.skillId).toBe(
          bank.find(({ id }) => id === snapshot.id)!.skillId,
        );
      bank.forEach((question) => {
        question.skillId = '1.1.1';
      });
      const copy = session.record;
      copy.questions[0]!.snapshot.skillId = '1.1.1';
      expect(session.record).toEqual(original);
      const restored = await restore(JSON.parse(JSON.stringify(original)));
      expect(restored.record).toEqual(original);
    });

    it('rejects legacy snapshots missing skill metadata with a start-new-session error', async () => {
      const session = await start(loadQuestionBanks(syntheticBanks()));
      const legacy = JSON.parse(JSON.stringify(session.record));
      delete legacy.questions[0].snapshot.skillId;
      await expect(restore(legacy)).rejects.toThrow(
        /Unsupported session snapshot.*skillId.*Start a new session/,
      );
    });

    it('includes even valid classification changes in the canonical content revision', async () => {
      const bank = loadQuestionBanks(syntheticBanks());
      const session = await start(bank);
      const original = session.record;
      const snapshot = original.questions[0]!.snapshot;
      const alternative = skills.find(
        (skill) =>
          skill.taskId === snapshot.taskId && skill.id !== snapshot.skillId,
      )!;
      const changed = structuredClone(original);
      changed.questions[0]!.snapshot.skillId = alternative.id;
      await expect(restore(changed)).rejects.toThrow(/snapshot|revision/);
      bank.find(({ id }) => id === snapshot.id)!.skillId = alternative.id;
      const fresh = await start(bank);
      expect(
        fresh.record.questions.find(
          ({ snapshot: item }) => item.id === snapshot.id,
        )!.revision,
      ).not.toBe(original.questions[0]!.revision);
    });

    it.each(['1.1.99', '2.1.1'])(
      'rejects unknown or mismatched snapshot skill %s',
      async (skillId) => {
        const session = await start(loadQuestionBanks(syntheticBanks()));
        const record = JSON.parse(JSON.stringify(session.record));
        record.questions[0].snapshot.skillId =
          skillId === '2.1.1'
            ? skills.find(
                (skill) =>
                  skill.domainId !== record.questions[0].snapshot.domainId,
              )!.id
            : skillId;
        await expect(restore(record)).rejects.toThrow(/skill/);
      },
    );
  });
}

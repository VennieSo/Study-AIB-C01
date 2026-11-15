import { expect, it } from 'vitest';
import { publicBanks } from '../src/data/public-banks';
import { domains } from '../src/lib/exam-scope';
import {
  loadQuestionBanks,
  practiceAvailability,
  practiceSizes,
  type PracticeScope,
} from '../src/lib/questions';
import { MemorySessionStorage, PracticeSession } from '../src/lib/session';
import {
  ExamSession,
  examAvailability,
  examPresets,
} from '../src/lib/exam-session';

const bank = loadQuestionBanks(publicBanks);
const dependencies = () => ({
  storage: new MemorySessionStorage(),
  random: () => 0.999,
  clock: () => Date.parse('2026-11-15T00:00:00Z'),
});
const scopes: PracticeScope[] = ['all', ...domains.map(({ id }) => id)];

for (const scope of scopes) {
  it.each(practiceSizes(scope))(
    `completes initial-bank Practice ${scope}/%i without repeats and retains explanations`,
    async (count) => {
      expect(
        practiceAvailability(bank, scope).sizes.find(
          ({ questionCount }) => questionCount === count,
        )?.available,
      ).toBe(true);
      const session = await PracticeSession.start(
        scope,
        bank,
        dependencies(),
        count,
      );
      const questions = session.record.questions;
      expect(new Set(questions.map(({ snapshot }) => snapshot.id)).size).toBe(
        count,
      );
      for (const { snapshot } of questions) {
        if (scope !== 'all') expect(snapshot.domainId).toBe(scope);
        expect(snapshot).toEqual(bank.find(({ id }) => id === snapshot.id));
        session.select(snapshot.correctOptionIds);
        session.submit();
        session.next();
      }
      expect(session.result()).toEqual({
        total: count,
        attempted: count,
        correct: count,
        incorrect: 0,
        unanswered: 0,
        percentage: 100,
      });
      expect(session.record.status).toBe('completed');
    },
  );
}

it.each(examPresets)(
  'completes initial-bank Exam $questionCount with weighted unique questions and raw scores',
  async ({ questionCount, durationMinutes }) => {
    expect(examAvailability(bank, questionCount).available).toBe(true);
    const session = await ExamSession.start(
      bank,
      dependencies(),
      questionCount,
    );
    const questions = session.record.questions;
    expect(new Set(questions.map(({ snapshot }) => snapshot.id)).size).toBe(
      questionCount,
    );
    expect(session.remainingMilliseconds()).toBe(durationMinutes * 60_000);
    for (const domain of domains) {
      const count = questions.filter(
        ({ snapshot }) => snapshot.domainId === domain.id,
      ).length;
      expect(count).toBeGreaterThanOrEqual(
        Math.floor((questionCount * domain.weight) / 100),
      );
      expect(count).toBeLessThanOrEqual(
        Math.ceil((questionCount * domain.weight) / 100),
      );
    }
    for (const [index, { snapshot }] of questions.entries()) {
      expect(snapshot).toEqual(bank.find(({ id }) => id === snapshot.id));
      session.goTo(index);
      if (index === 0) session.select(snapshot.correctOptionIds);
      else if (index === 1)
        session.select([
          snapshot.options.find(
            ({ id }) => !snapshot.correctOptionIds.includes(id),
          )!.id,
        ]);
    }
    session.submit();
    expect(session.result()).toEqual({
      total: questionCount,
      attempted: 2,
      correct: 1,
      incorrect: 1,
      unanswered: questionCount - 2,
      percentage: 100 / questionCount,
    });
    expect(session.record.questions).toEqual(
      questions.map((item, index) =>
        expect.objectContaining({
          snapshot: item.snapshot,
          feedback: index === 0 ? 'correct' : index === 1 ? 'incorrect' : null,
        }),
      ),
    );
  },
);

import { describe, expect, it } from 'vitest';
import { loadQuestionBanks, validateLaunchCounts } from '../src/lib/questions';
import { syntheticBank } from './fixtures/questions';

describe('question content loading', () => {
  it('loads the canonical bank and retains domain/task metadata', () => {
    const questions = loadQuestionBanks({ 'domain-1': syntheticBank() });
    expect(questions).toHaveLength(12);
    expect(questions[0]).toMatchObject({
      id: 'synthetic-1',
      domainId: 'domain-1',
      taskId: '1.1',
    });
  });

  it.each([
    [
      'schema version',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.schemaVersion = 3;
      },
    ],
    [
      'unknown fields',
      (bank: ReturnType<typeof syntheticBank>) => {
        Object.assign(bank.questions[0]!, { extra: true });
      },
    ],
    [
      'wrong task',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.questions[0]!.taskId = '2.1';
      },
    ],
    [
      'duplicate questions',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.questions.push(bank.questions[0]!);
      },
    ],
    [
      'duplicate options',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.questions[0]!.options[1]!.id = 'option-1';
      },
    ],
    [
      'missing answer',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.questions[0]!.correctOptionIds = ['missing'];
      },
    ],
    [
      'answer cardinality',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.questions[0]!.correctOptionIds = ['option-1', 'option-2'];
      },
    ],
    [
      'blank text',
      (bank: ReturnType<typeof syntheticBank>) => {
        bank.questions[0]!.text = '  ';
      },
    ],
  ])('rejects invalid content: %s', (_, mutate) => {
    const bank = syntheticBank();
    mutate(bank);
    expect(() => loadQuestionBanks({ 'domain-1': bank })).toThrow();
  });

  it('rejects a bank filed under a different domain', () => {
    expect(() => loadQuestionBanks({ 'domain-2': syntheticBank() })).toThrow(
      /domain/,
    );
  });

  it('permits a legitimate small pool but reports launch shortfalls separately', () => {
    const questions = loadQuestionBanks({ 'domain-1': syntheticBank(2) });
    expect(questions).toHaveLength(2);
    expect(() => validateLaunchCounts(questions)).toThrow(/25 questions/);
  });

  it('rejects question IDs duplicated across different domain files', () => {
    const second = syntheticBank();
    second.questions.forEach((question) => {
      question.domainId = 'domain-2';
      question.taskId = '2.1';
      question.skillId = '2.1.1';
    });
    expect(() =>
      loadQuestionBanks({ 'domain-1': syntheticBank(), 'domain-2': second }),
    ).toThrow(/Duplicate question/);
  });

  it('accepts the multiple-response content contract without treating it as single-answer content', () => {
    const bank = syntheticBank(1);
    bank.questions[0]!.type = 'multiple';
    bank.questions[0]!.options.push({
      id: 'option-5',
      text: 'Synthetic fifth option',
    });
    bank.questions[0]!.correctOptionIds = ['option-1', 'option-5'];
    expect(loadQuestionBanks({ 'domain-1': bank })[0]!.type).toBe('multiple');
    bank.questions[0]!.correctOptionIds = ['option-5'];
    expect(() => loadQuestionBanks({ 'domain-1': bank })).toThrow();
  });

  it('rejects non-AWS and unsafe reference URLs', () => {
    const bank = syntheticBank(1);
    for (const url of [
      'javascript:alert(1)',
      'https://example.com/',
      'https://aws.amazon.com.example.com/',
    ]) {
      Object.assign(bank.questions[0]!, {
        references: [{ title: 'Reference', url }],
      });
      expect(() => loadQuestionBanks({ 'domain-1': bank })).toThrow();
    }
  });
});

it.each([
  [
    'fewer than five options',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.options = question.options.slice(0, 4);
      question.correctOptionIds = ['option-1', 'option-3'];
    },
  ],
  [
    'fewer than two correct IDs',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.correctOptionIds = ['option-1'];
    },
  ],
  [
    'duplicate correct IDs',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.correctOptionIds = ['option-1', 'option-1'];
    },
  ],
  [
    'duplicate options',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.options[1]!.id = 'option-1';
    },
  ],
  [
    'unknown correct ID',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.correctOptionIds = ['option-1', 'missing'];
    },
  ],
  [
    'blank option text',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.options[0]!.text = ' ';
    },
  ],
  [
    'missing explanation',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.explanation = '';
    },
  ],
  [
    'wrong task/domain relationship',
    (question: ReturnType<typeof syntheticBank>['questions'][number]) => {
      question.taskId = '4.1';
    },
  ],
])('rejects invalid multiple-response content: %s', (_, mutate) => {
  const bank = syntheticBank(1, 'multiple');
  mutate(bank.questions[0]!);
  expect(() => loadQuestionBanks({ 'domain-1': bank })).toThrow();
});

it('reports every supported size from actual reduced pool counts without padding', async () => {
  const { practiceAvailability } = await import('../src/lib/questions');
  const { syntheticBanks } = await import('./fixtures/questions');
  const banks = syntheticBanks(16);
  const questions = loadQuestionBanks(banks);
  expect(practiceAvailability(questions, 'domain-3')).toEqual({
    count: 16,
    sizes: [
      { questionCount: 10, available: true },
      { questionCount: 15, available: true },
      { questionCount: 20, available: false },
      { questionCount: 25, available: false },
    ],
  });
  expect(practiceAvailability(questions, 'all')).toEqual({
    count: 64,
    sizes: [
      { questionCount: 20, available: true },
      { questionCount: 40, available: true },
      { questionCount: 60, available: true },
      { questionCount: 85, available: false },
    ],
  });
});

it('provides 25 synthetic questions for each domain and covers every valid task', async () => {
  const { syntheticBanks } = await import('./fixtures/questions');
  const questions = loadQuestionBanks(syntheticBanks());
  expect(() => validateLaunchCounts(questions)).not.toThrow();
  expect(questions).toHaveLength(100);
  expect(
    [...new Set(questions.map((question) => question.taskId))].sort(),
  ).toEqual([
    '1.1',
    '1.2',
    '1.3',
    '2.1',
    '2.2',
    '2.3',
    '3.1',
    '3.2',
    '3.3',
    '4.1',
    '4.2',
    '4.3',
    '4.4',
  ]);
});

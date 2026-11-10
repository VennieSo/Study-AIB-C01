import { domains, type DomainId } from '../../src/lib/exam-scope';

// Synthetic interface fixtures. These are not exam preparation content.
export function syntheticBank(
  count = 12,
  type: 'single' | 'multiple' | 'mixed' = 'single',
) {
  return {
    schemaVersion: 1,
    questions: Array.from({ length: count }, (_, index) => {
      const multiple =
        type === 'multiple' || (type === 'mixed' && index % 2 === 1);
      const targets = multiple ? [0, 2, 4] : [index % 4];
      return {
        id: `synthetic-${index + 1}`,
        domainId: 'domain-1',
        taskId: '1.1',
        type: multiple ? 'multiple' : 'single',
        text: `Synthetic fixture ${index + 1}. This development-only scenario checks how a longer question reads in the practice interface. It contains multiple paragraphs and does not assess exam knowledge.\n\nTo complete this interface check, select ${multiple ? 'all options' : 'the option'} labelled “Fixture target ${index + 1}”.`,
        options: Array.from({ length: multiple ? 6 : 4 }, (_, option) => ({
          id: `option-${option + 1}`,
          text: targets.includes(option)
            ? `Fixture target ${index + 1}${multiple ? `.${option + 1}` : ''}`
            : `Fixture alternative ${index + 1}.${option + 1}`,
        })),
        correctOptionIds: targets.map((option) => `option-${option + 1}`),
        explanation: `This is synthetic interface test ${index + 1}. The requested ${multiple ? 'targets are the correct choices' : 'target is the correct choice'}. This fixture does not teach or assess exam knowledge.`,
      };
    }),
  };
}

/** Clearly synthetic fixtures spanning every official domain and task. */
export function syntheticBanks(countPerDomain = 25) {
  return Object.fromEntries(
    domains.map((domain) => [
      domain.id,
      {
        schemaVersion: 1,
        questions: syntheticBank(countPerDomain, 'mixed').questions.map(
          (question, index) => ({
            ...question,
            id:
              domain.id === 'domain-1'
                ? question.id
                : `${domain.id}-${question.id}`,
            text:
              domain.id === 'domain-1'
                ? question.text
                : question.text.replace(
                    'Synthetic fixture ',
                    `Synthetic fixture ${domain.id}.`,
                  ),
            domainId: domain.id,
            taskId: Object.keys(domain.tasks)[
              index % Object.keys(domain.tasks).length
            ]!,
          }),
        ),
      },
    ]),
  ) as Record<DomainId, ReturnType<typeof syntheticBank>>;
}

// Synthetic interface fixtures. These are not exam preparation content.
export function syntheticBank(count = 12) {
  return {
    schemaVersion: 1,
    questions: Array.from({ length: count }, (_, index) => ({
      id: `synthetic-${index + 1}`,
      domainId: 'domain-1',
      taskId: '1.1',
      type: 'single',
      text: `Synthetic fixture ${index + 1}. To check this practice interface, select the option labelled “Fixture target ${index + 1}”.`,
      options: Array.from({ length: 4 }, (_, option) => ({
        id: `option-${option + 1}`,
        text:
          option === index % 4
            ? `Fixture target ${index + 1}`
            : `Fixture alternative ${index + 1}.${option + 1}`,
      })),
      correctOptionIds: [`option-${(index % 4) + 1}`],
      explanation: `This is synthetic interface test ${index + 1}. The requested target is the correct choice. This fixture does not teach or assess exam knowledge.`,
    })),
  };
}

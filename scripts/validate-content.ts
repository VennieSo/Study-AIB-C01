import { publicBanks } from '../src/data/public-banks';
import { loadQuestionBanks, validateLaunchCounts } from '../src/lib/questions';

const synthetic = process.argv.includes('--synthetic');
const banks = synthetic
  ? (await import('../tests/fixtures/questions')).syntheticBanks()
  : publicBanks;
const questions = loadQuestionBanks(banks);
if (synthetic || process.argv.includes('--launch'))
  validateLaunchCounts(questions);
console.log(
  `${synthetic ? 'Synthetic question fixtures' : 'Public question bank'} valid: ${questions.length} questions.${questions.length === 0 ? ' Practice is unavailable until content is added.' : ''}`,
);

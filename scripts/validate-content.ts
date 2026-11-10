import { publicBanks } from '../src/data/public-banks';
import { loadQuestionBanks, validateLaunchCounts } from '../src/lib/questions';

const questions = loadQuestionBanks(publicBanks);
if (process.argv.includes('--launch')) validateLaunchCounts(questions);
console.log(
  `Public question bank valid: ${questions.length} questions.${questions.length === 0 ? ' Practice is unavailable until content is added.' : ''}`,
);

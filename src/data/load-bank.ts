import { publicBanks } from './public-banks';
import { loadQuestionBanks } from '../lib/questions';

// Executed by Astro on the build/dev server, never by the browser.
export async function loadSiteBank() {
  const synthetic = import.meta.env.DEV || import.meta.env.MODE === 'fixture';
  const banks = synthetic
    ? (await import('../../tests/fixtures/questions')).syntheticBanks()
    : publicBanks;
  return { questions: loadQuestionBanks(banks), synthetic };
}

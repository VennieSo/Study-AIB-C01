import type { DomainId } from '../lib/exam-scope';
import { publicBanks } from './public-banks';
import { loadQuestionBanks } from '../lib/questions';

// Executed by Astro on the build/dev server, never by the browser.
export async function loadSiteBank() {
  const synthetic = import.meta.env.DEV || import.meta.env.MODE === 'fixture';
  let banks: Record<DomainId, { schemaVersion: number; questions: unknown[] }> =
    publicBanks;
  if (synthetic) {
    const { syntheticBanks } = await import('../../tests/fixtures/questions');
    banks = syntheticBanks();
    // Explicit QA-only reduced pools; production never reads this setting.
    const counts = process.env['AIB_FIXTURE_COUNTS'];
    if (import.meta.env.DEV && counts !== undefined) {
      const values = counts.split(',').map(Number);
      if (
        values.length !== 4 ||
        values.some(
          (count) => !Number.isInteger(count) || count < 0 || count > 25,
        )
      )
        throw new Error(
          'AIB_FIXTURE_COUNTS requires four whole counts from 0 to 25.',
        );
      Object.values(banks).forEach((bank, index) => {
        bank.questions = bank.questions.slice(0, values[index]);
      });
    }
  }
  return { questions: loadQuestionBanks(banks), synthetic };
}

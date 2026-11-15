import { expect, test, type Page } from '@playwright/test';
import type { Question } from '../../src/lib/questions';

async function pageBank(page: Page): Promise<Question[]> {
  return JSON.parse((await page.locator('#question-data').textContent()) ?? '');
}
async function currentQuestion(page: Page) {
  const text = await page.getByRole('heading', { level: 1 }).innerText();
  const bank = await pageBank(page);
  const question = bank.find(
    (q) => q.text.replace(/\s/g, '') === text.replace(/\s/g, ''),
  );
  expect(question).toBeDefined();
  return question!;
}
async function answer(page: Page, name: string, ids: string[]) {
  for (const input of await page.locator(`input[name="${name}"]`).all()) {
    if (ids.includes(await input.inputValue())) await input.check();
  }
}

test('production includes the complete initial bank and enables every configuration', async ({
  page,
}) => {
  const response = await page.goto('/');
  const html = await response!.text();
  const bank = await pageBank(page);
  expect(html).toContain('Study the strategy behind AI.');
  expect(html).toContain('name="description"');
  for (const marker of ['synthetic-', 'Fixture target', 'Development preview'])
    expect(html).not.toContain(marker);
  expect(bank).toHaveLength(135);
  await expect(page).toHaveTitle(/Study AIB-C01/);
  for (const count of [20, 40, 60, 85]) {
    await page
      .getByLabel('Exam length', { exact: true })
      .selectOption(String(count));
    await expect(
      page.getByRole('button', { name: 'Start exam', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('#exam-availability')).toContainText(
      `${bank.length} questions available`,
    );
  }
  for (const scope of ['all', 'domain-1', 'domain-2', 'domain-3', 'domain-4']) {
    await page.getByLabel('Choose a domain').selectOption(scope);
    const count =
      scope === 'all'
        ? bank.length
        : bank.filter(({ domainId }) => domainId === scope).length;
    for (const size of scope === 'all' ? [20, 40, 60, 85] : [10, 15, 20, 25]) {
      await page.getByLabel('Question count').selectOption(String(size));
      await expect(page.locator('#availability')).toContainText(
        `${count} questions available`,
      );
      await page
        .getByRole('button', { name: 'Start practice', exact: true })
        .click();
      await expect(page.locator('.progress-heading')).toHaveText(
        `Question 1 of ${size}`,
      );
      const question = await currentQuestion(page);
      if (scope !== 'all') expect(question.domainId).toBe(scope);
      page.once('dialog', (dialog) => dialog.accept());
      await page
        .getByRole('button', { name: 'End practice', exact: true })
        .click();
    }
  }
});

test('production Practice completes with canonical feedback and explanations', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  const seen = new Set<string>();
  for (let index = 0; index < 10; index++) {
    const question = await currentQuestion(page);
    expect(seen.has(question.id)).toBe(false);
    seen.add(question.id);
    await answer(page, 'answer', question.correctOptionIds);
    await page
      .getByRole('button', { name: 'Submit answer', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Correct', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(question.explanation, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: index === 9 ? 'See results' : 'Next question',
        exact: true,
      })
      .click();
  }
  await expect(page.locator('.score')).toHaveText('100%');
});

for (const count of [20, 40, 60, 85]) {
  test(`production Exam ${count} preserves answers and canonical review`, async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByLabel('Exam length', { exact: true })
      .selectOption(String(count));
    await page.getByRole('button', { name: 'Start exam', exact: true }).click();
    const question = await currentQuestion(page);
    await answer(page, 'exam-answer', question.correctOptionIds);
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', { name: 'Submit exam', exact: true })
      .click();
    await expect(page.getByLabel('Session counts')).toContainText('Correct1');
    await expect(page.getByLabel('Session counts')).toContainText(
      `Unanswered${count - 1}`,
    );
    const items = page
      .getByRole('region', { name: 'Answer review', exact: true })
      .locator('details');
    await expect(items).toHaveCount(count);
    await items.first().locator('summary').click();
    await expect(items.first()).toContainText(question.explanation);
    await expect(
      items
        .first()
        .locator('.review-option')
        .filter({ hasText: 'Your answer' }),
    ).toHaveCount(question.correctOptionIds.length);
  });
}

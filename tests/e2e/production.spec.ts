import { expect, test, type Page } from '@playwright/test';
import type { Question } from '../../src/lib/questions';
import { readdir, readFile } from 'node:fs/promises';

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
});

test.afterEach(async ({ page }, testInfo) => {
  await page.screenshot({
    path: testInfo.outputPath('production-journey.png'),
    fullPage: true,
  });
  expect(
    browserErrors.get(page),
    'browser console, page and network errors',
  ).toEqual([]);
});

async function pageBank(page: Page): Promise<Question[]> {
  return JSON.parse((await page.locator('#question-data').textContent()) ?? '');
}
async function currentQuestion(page: Page) {
  const text = await page.getByRole('heading', { level: 1 }).innerText();
  const bank = await pageBank(page);
  const expectedBanks = await Promise.all(
    [1, 2, 3, 4].map(
      async (domain) =>
        JSON.parse(
          await readFile(`src/data/questions/domain-${domain}.json`, 'utf8'),
        ) as { questions: Question[] },
    ),
  );
  expect(bank).toEqual(expectedBanks.flatMap(({ questions }) => questions));
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

for (const mode of ['Practice', 'Exam'] as const) {
  test(`production ${mode} preserves explanation line breaks`, async ({
    page,
  }) => {
    await page.goto('/');
    if (mode === 'Exam')
      await page.getByLabel('Exam length', { exact: true }).selectOption('20');
    await page
      .getByRole('button', {
        name: mode === 'Practice' ? 'Start practice' : 'Start exam',
        exact: true,
      })
      .click();
    const question = await currentQuestion(page);
    expect(question.explanation).toContain('\n\n');
    await answer(
      page,
      mode === 'Practice' ? 'answer' : 'exam-answer',
      question.correctOptionIds,
    );
    if (mode === 'Practice') {
      await page
        .getByRole('button', { name: 'Submit answer', exact: true })
        .click();
    } else {
      page.once('dialog', (dialog) => dialog.accept());
      await page
        .getByRole('button', { name: 'Submit exam', exact: true })
        .click();
      await page
        .locator('.exam-review-item')
        .first()
        .locator('summary')
        .click();
    }
    const text =
      mode === 'Practice'
        ? page
            .locator('.feedback')
            .getByText(question.explanation, { exact: true })
        : page
            .locator('.exam-review-item')
            .first()
            .locator('.review-explanation > p');
    await expect(text).toBeVisible();
    expect(await text.innerText()).toBe(
      question.explanation.replace(/\r\n/g, '\n'),
    );
  });
}

test('production serves every built public asset unchanged', async ({
  page,
}) => {
  await page.goto('/');
  const files = [
    'index.html',
    'favicon.svg',
    ...(await readdir('dist/_astro')).map((name) => `_astro/${name}`),
  ];
  for (const file of files) {
    const response = await page.request.get(
      file === 'index.html' ? '/' : `/${file}`,
    );
    expect(response.status(), file).toBe(200);
    expect(await response.body(), file).toEqual(await readFile(`dist/${file}`));
    if (process.env['LIVE_BASE_URL'])
      expect(new URL(response.url()).protocol, file).toBe('https:');
  }
});

test('production includes the complete initial bank and enables every configuration', async ({
  page,
}, testInfo) => {
  const response = await page.goto('/');
  const html = await response!.text();
  const bank = await pageBank(page);
  expect(html).toContain('Study the strategy behind AI.');
  expect(html).toContain('name="description"');
  for (const marker of ['synthetic-', 'Fixture target', 'Development preview'])
    expect(html).not.toContain(marker);
  expect(bank).toHaveLength(135);
  await expect(page).toHaveTitle(/Study AIB-C01/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /AIB-C01/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('production-homepage.png'),
    fullPage: true,
  });
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
}, testInfo) => {
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
  await page.screenshot({
    path: testInfo.outputPath('production-practice-results.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Practice again', exact: true })
    .click();
  await expect(page.locator('.progress-heading')).toHaveText(
    'Question 1 of 10',
  );
});

for (const count of [20, 40, 60, 85]) {
  test(`production Exam ${count} preserves answers and canonical review`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-11-15T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-15T00:00:01Z'));
    await page.goto('/');
    await page
      .getByLabel('Exam length', { exact: true })
      .selectOption(String(count));
    await page.getByRole('button', { name: 'Start exam', exact: true }).click();
    const minutes = (
      { 20: 30, 40: 65, 60: 95, 85: 130 } as Record<number, number>
    )[count];
    await expect(
      page.getByRole('timer', { name: 'Time remaining', exact: true }),
    ).toHaveText(`${minutes}:00`);
    const question = await currentQuestion(page);
    await answer(page, 'exam-answer', question.correctOptionIds);
    const last = page.getByRole('button', {
      name: `Question ${count}, unanswered`,
      exact: true,
    });
    await last.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#exam-heading')).toBeFocused();
    await page
      .getByRole('button', { name: 'Question 1, answered', exact: true })
      .click();
    for (const id of question.correctOptionIds)
      await expect(page.locator(`input[value="${id}"]`)).toBeChecked();
    await expect(
      page.getByRole('timer', { name: 'Time remaining', exact: true }),
    ).toHaveText(`${minutes}:00`);
    page.once('dialog', (dialog) => dialog.dismiss());
    await page
      .getByRole('button', { name: 'Submit exam', exact: true })
      .click();
    await expect(page.locator('#exam-heading')).toBeVisible();
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
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByRole('button', { name: 'Test again', exact: true }).click();
    await expect(
      page.getByText(`Question 1 of ${count}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`0 answered · ${count} unanswered`, { exact: true }),
    ).toBeVisible();
  });
}

test('production multiple-response Practice rejects empty answers, accepts every checkbox, locks feedback and scores exact sets', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Choose a domain').selectOption('domain-3');
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  let incorrect = 0;
  for (let index = 0; index < 10; index++) {
    const question = await currentQuestion(page);
    if (question.type === 'multiple' && incorrect === 0) {
      await page
        .getByRole('button', { name: 'Submit answer', exact: true })
        .click();
      await expect(page.locator('#answer-error')).toHaveText(
        'Select an answer before submitting.',
      );
      const boxes = page.getByRole('checkbox');
      await boxes.first().focus();
      await page.keyboard.press('Space');
      await expect(boxes.first()).toBeChecked();
      for (const box of await boxes.all()) await box.check();
      await page
        .getByRole('button', { name: 'Submit answer', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Incorrect', exact: true }),
      ).toBeFocused();
      for (const box of await boxes.all()) {
        await expect(box).toBeChecked();
        await expect(box).toBeDisabled();
      }
      await expect(
        page.getByRole('button', { name: 'Submit answer', exact: true }),
      ).toBeDisabled();
      incorrect++;
    } else {
      await answer(page, 'answer', question.correctOptionIds);
      await page
        .getByRole('button', { name: 'Submit answer', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Correct', exact: true }),
      ).toBeFocused();
    }
    await expect(
      page.getByText(question.explanation, { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', {
        name: index === 9 ? 'See results' : 'Next question',
        exact: true,
      })
      .click();
  }
  expect(incorrect).toBe(1);
  await expect(page.locator('.score')).toHaveText('90%');
});

test('production Exam allows partial and over-selected revisions, then expires with unanswered questions and immutable review', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-11-15T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-15T00:00:01Z'));
  await page.goto('/');
  await page.getByLabel('Exam length', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  let question = await currentQuestion(page);
  let index = 0;
  while (question.type !== 'multiple' && index < 19) {
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
    question = await currentQuestion(page);
    index++;
  }
  expect(question.type).toBe('multiple');
  const boxes = page.getByRole('checkbox');
  for (const box of await boxes.all()) await box.check();
  for (const box of await boxes.all()) await expect(box).toBeChecked();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Previous question', exact: true })
    .click();
  for (const box of await boxes.all()) await expect(box).toBeChecked();
  await page.getByRole('button', { name: 'Clear answer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Clear answer', exact: true }),
  ).toBeDisabled();
  await answer(page, 'exam-answer', [question.correctOptionIds[0]!]);
  await page.clock.fastForward(31 * 60_000);
  await expect(
    page.getByRole('heading', { name: 'Exam complete', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.score')).toHaveText('0%');
  await expect(page.getByLabel('Session counts')).toContainText('Attempted1');
  await expect(page.getByLabel('Session counts')).toContainText('Incorrect1');
  await expect(page.getByLabel('Session counts')).toContainText('Unanswered19');
  const review = page.locator('.exam-review-item').nth(index);
  await review.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(review).toContainText(question.explanation);
  await expect(
    review.locator('.review-option').filter({ hasText: 'Your answer' }),
  ).toHaveCount(1);
  await expect(
    review.getByText('Missed correct answer', { exact: false }),
  ).toHaveCount(question.correctOptionIds.length - 1);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await expect(page.getByLabel('Session counts')).toContainText('Incorrect1');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator('.results-panel')
    .screenshot({ path: testInfo.outputPath('production-exam-results.png') });
  await review.screenshot({
    path: testInfo.outputPath('production-exam-review.png'),
  });
});

test('production mode changes can be cancelled and reload discards an active session', async ({
  page,
}) => {
  await page.goto('/#exam-configuration-heading');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  const question = await currentQuestion(page);
  await answer(page, 'exam-answer', question.correctOptionIds);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'End exam', exact: true }).click();
  await expect(page.locator('#exam-heading')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', { name: 'Practice', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Your next practice session',
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  const warning = page.waitForEvent('dialog');
  const reload = page.reload();
  const dialog = await warning;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.accept();
  await reload;
  await expect(
    page.getByRole('button', { name: 'Start practice', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#session-view')).toBeHidden();
  await expect(page.locator('#exam-session-view')).toBeHidden();
});

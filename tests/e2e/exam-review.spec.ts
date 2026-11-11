import { expect, test } from '@playwright/test';

test('submitted review preserves every answer subset and unanswered item, then starts a fresh exam', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await page.getByLabel('Exam length', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Answer review', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  for (const index of [4, 2, 0])
    await page.getByRole('checkbox').nth(index).check();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Answer review', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'End exam', exact: true }),
  ).toBeVisible();
  const review = page.getByRole('region', {
    name: 'Answer review',
    exact: true,
  });
  const items = review.locator('details');
  await expect(items).toHaveCount(20);
  await expect(page.getByLabel('Session counts')).toContainText('Attempted4');
  await expect(page.getByLabel('Session counts')).toContainText('Correct2');
  await expect(page.getByLabel('Session counts')).toContainText('Incorrect2');
  await expect(page.getByLabel('Session counts')).toContainText('Unanswered16');
  await expect(page.getByText('10%', { exact: true })).toBeVisible();
  const domains = page.getByRole('region', {
    name: 'Exam performance by domain',
    exact: true,
  });
  await expect(domains.getByRole('article')).toHaveCount(4);
  await expect(domains.getByRole('article').first()).toContainText(
    'Attempted3',
  );
  await expect(domains.getByRole('article').first()).toContainText(
    'Incorrect2',
  );
  await expect(domains.getByRole('article').first()).toContainText(
    'Unanswered2',
  );
  await expect(domains.getByRole('article').first()).toContainText('20%');

  await items.nth(1).locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(items.nth(1)).toContainText('Incorrect');
  await expect(
    items.nth(1).locator('.review-option').filter({ hasText: 'Your answer' }),
  ).toHaveCount(2);
  await expect(
    items
      .nth(1)
      .locator('.review-option')
      .filter({ hasText: /[Cc]orrect answer/ }),
  ).toHaveCount(3);
  const partialOptions = items.nth(1).locator('.review-option');
  await expect(partialOptions.nth(4)).toContainText('Missed correct answer');
  await expect(partialOptions.nth(4)).toHaveCSS(
    'background-color',
    'rgb(254, 249, 195)',
  );
  await expect(partialOptions.nth(0)).toHaveCSS(
    'background-color',
    'rgb(240, 253, 244)',
  );
  await expect(partialOptions.nth(1)).toHaveCSS(
    'background-color',
    'rgb(255, 245, 244)',
  );
  await expect(partialOptions.nth(5)).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(items.nth(1).locator('.review-outcome')).toHaveCSS(
    'color',
    'rgb(180, 35, 24)',
  );
  await expect(items.nth(1)).toContainText('Task 1.2');
  await expect(items.nth(1)).toContainText(
    'This is synthetic interface test 2.',
  );
  await items.nth(3).locator('summary').click();
  await expect(
    items.nth(3).locator('.review-option').filter({ hasText: 'Your answer' }),
  ).toHaveCount(6);
  await items.nth(6).locator('summary').click();
  await expect(items.nth(6).locator('summary')).toContainText('Correct');
  await expect(
    items.nth(6).locator('.review-option').filter({ hasText: 'Your answer' }),
  ).toHaveCount(3);
  await items.nth(2).locator('summary').click();
  await expect(items.nth(2)).toContainText('Your answer: Unanswered');
  await expect(
    items.nth(2).locator('.review-option').filter({ hasText: 'Your answer' }),
  ).toHaveCount(0);
  await expect(
    items
      .nth(2)
      .locator('.review-option')
      .filter({ hasText: 'Correct answer' }),
  ).toHaveCSS('background-color', 'rgb(240, 253, 244)');
  await items.nth(8).locator('summary').click();
  await expect(items.nth(8).locator('summary')).toHaveText(
    'Question 9 Unanswered',
  );
  await expect(items.nth(8)).toContainText('Your answer: Unanswered');
  await expect(
    items.nth(8).getByText('✓ Missed correct answer', { exact: true }),
  ).toHaveCount(3);
  await items.first().locator('summary').click();
  await expect(
    items.first().getByRole('link', { name: /AWS exam guide/ }),
  ).toHaveAttribute(
    'href',
    'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
  );
  await expect(review.getByRole('radio')).toHaveCount(0);
  await expect(review.getByRole('checkbox')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === 'mobile')
    await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('exam-review.png'),
    fullPage: true,
    scale: 'css',
  });
  await page.locator('.results-panel').screenshot({
    path: testInfo.outputPath('exam-domain-results.png'),
    scale: 'css',
  });
  await items.nth(1).screenshot({
    path: testInfo.outputPath('exam-partial-answer-review.png'),
    scale: 'css',
  });
  await page.getByRole('button', { name: 'Exam again' }).click();
  await expect(
    page.getByText('Question 1 of 20', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: /Fixture target/ }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('heading', { name: 'Answer review', exact: true }),
  ).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await expect(page.getByLabel('Session counts')).toContainText('Unanswered20');
  await page.getByRole('button', { name: 'End exam', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your next exam session', exact: true }),
  ).toBeFocused();
});

test('full-length results retain all eighty-five questions and a readable rounded percentage at narrow mobile width', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.clock.install({ time: new Date('2026-11-10T10:00:00.000Z') });
  await page.clock.pauseAt(new Date('2026-11-10T10:00:01.000Z'));
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await expect(page.getByLabel('Exam length', { exact: true })).toHaveValue(
    '85',
  );
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  await page
    .getByRole('button', { name: 'Question 85, unanswered', exact: true })
    .click();
  await page.clock.fastForward(131 * 60_000);
  await expect(
    page.getByRole('heading', { name: 'Exam complete', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.score')).toHaveText('1.2%');
  await expect(page.getByLabel('Session counts')).toContainText('Total85');
  await expect(page.getByLabel('Session counts')).toContainText('Attempted1');
  await expect(page.getByLabel('Session counts')).toContainText('Correct1');
  await expect(page.getByLabel('Session counts')).toContainText('Unanswered84');
  const domainResults = page.getByRole('region', {
    name: 'Exam performance by domain',
    exact: true,
  });
  await expect(domainResults.getByRole('article')).toHaveCount(4);
  const secondDomain = domainResults.getByRole('article').nth(1);
  await expect(secondDomain).toContainText('Total24');
  await expect(secondDomain).toContainText('Unanswered23');
  await expect(secondDomain).toContainText('4.2%');
  const items = page
    .getByRole('region', { name: 'Answer review', exact: true })
    .locator('details');
  await expect(items).toHaveCount(85);
  await items.last().locator('summary').click();
  await expect(items.last()).toContainText('Your answer: Unanswered');
  await items.first().locator('summary').click();
  await expect(
    items.first().locator('.review-option').filter({ hasText: 'Your answer' }),
  ).toHaveCount(1);
  await expect(items.first()).toContainText(
    'This is synthetic interface test 1.',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator('.results-panel')
    .screenshot({ path: testInfo.outputPath('exam-85-results-320.png') });
  await items
    .first()
    .screenshot({ path: testInfo.outputPath('exam-85-review-320.png') });
});

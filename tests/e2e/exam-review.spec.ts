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
  await page.getByRole('checkbox').nth(2).check();
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
      .filter({ hasText: 'Correct answer' }),
  ).toHaveCount(3);
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
  await page.screenshot({
    path: testInfo.outputPath('exam-review.png'),
    fullPage: true,
    scale: 'css',
  });
  await page
    .locator('.results-panel')
    .screenshot({
      path: testInfo.outputPath('exam-domain-results.png'),
      scale: 'css',
    });
  await items
    .nth(1)
    .screenshot({
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
  await page
    .getByRole('button', { name: 'Change configuration', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your next exam session', exact: true }),
  ).toBeFocused();
});

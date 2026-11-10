import { expect, test } from '@playwright/test';

test('exam supports skipping, revision, cancellation, unrestricted selections, and immutable results', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await expect(
    page.getByText('Question 1 of 20', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Time remaining')).toHaveText('30:00');
  await expect(page.locator('#exam-session-view .pill')).toHaveCount(0);
  await expect(page.getByText(/^Correct answer/)).toHaveCount(0);
  await expect(page.getByText(/This is synthetic interface test/)).toHaveCount(
    0,
  );
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  const boxes = page.getByRole('checkbox');
  await expect(boxes).toHaveCount(6);
  for (const box of await boxes.all()) await box.check();
  for (const box of await boxes.all()) await box.uncheck();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Previous question', exact: true })
    .click();
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await boxes.first().focus();
  await page.keyboard.press('Space');
  await page
    .getByRole('button', { name: 'Previous question', exact: true })
    .click();
  await expect(
    page.getByRole('radio', { name: /Fixture target/ }),
  ).toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath('exam-active.png'),
    fullPage: true,
  });
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('18 unanswered');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await expect(
    page.getByText('Question 1 of 20', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: /Fixture target/ }),
  ).toBeChecked();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Exam complete' }),
  ).toBeFocused();
  await expect(page.getByLabel('Session counts')).toContainText('Attempted2');
  await expect(page.getByLabel('Session counts')).toContainText('Incorrect1');
  await expect(page.getByLabel('Session counts')).toContainText('Unanswered18');
  await expect(page.getByText('5%', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('exam-results.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Exam again' }).click();
  await expect(
    page.getByText('Question 1 of 20', { exact: true }),
  ).toBeVisible();
});

test('delayed execution expires without confirmation and preserves selected answers', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00.000Z') });
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  await page.clock.fastForward(31 * 60 * 1000);
  await expect(
    page.getByRole('heading', { name: 'Exam complete' }),
  ).toBeVisible();
  await expect(page.getByLabel('Session counts')).toContainText('Attempted1');
  await expect(page.getByLabel('Session counts')).toContainText('Unanswered19');
  await expect(page.getByText('5%', { exact: true })).toBeVisible();
  await page.clock.fastForward(60 * 1000);
  await expect(page.getByLabel('Session counts')).toContainText('Attempted1');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('exam-timeout.png'),
    fullPage: true,
  });
});

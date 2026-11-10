import { expect, test } from '@playwright/test';

test('a visitor completes ten unique questions, sees feedback and results, and restarts', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByText('Development preview · synthetic questions'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start practice' }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 10; index++) {
    const question = page.getByRole('heading', { level: 1 });
    await expect(
      page.getByText(`Question ${index + 1} of 10`, { exact: true }),
    ).toBeVisible();
    const text = await question.innerText();
    expect(seen.has(text)).toBe(false);
    seen.add(text);
    const next = page.getByRole('button', {
      name: index === 9 ? 'See results' : 'Next question',
      exact: true,
    });
    await expect(next).toBeDisabled();
    if (index === 0) {
      await page.getByRole('button', { name: 'Submit answer' }).click();
      await expect(page.getByRole('alert')).toHaveText(
        'Select an answer before submitting.',
      );
    }
    const answer = page.getByRole('radio', { name: /Fixture target/ });
    await answer.focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(
      page.getByRole('heading', { name: 'Correct', exact: true }),
    ).toBeVisible();
    await expect(answer).toBeDisabled();
    await expect(
      page.getByText(/This is synthetic interface test/),
    ).toBeVisible();
    await next.click();
  }
  await expect(
    page.getByRole('heading', { name: 'Practice complete' }),
  ).toBeVisible();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Session counts')).toContainText('Attempted10');
  await page.getByRole('button', { name: 'Practice again' }).click();
  await expect(
    page.getByText('Question 1 of 10', { exact: true }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Change configuration' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your next practice session' }),
  ).toBeVisible();
});

test('layout, incorrect feedback, keyboard focus, and leave warnings work', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Study the strategy behind AI.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start practice' }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('homepage.png'),
    fullPage: true,
  });
  await page.getByLabel('Choose a domain').selectOption('domain-2');
  await expect(
    page.getByRole('button', { name: 'Start practice' }),
  ).toBeDisabled();
  await expect(
    page.getByText(/0 questions available. This domain needs/),
  ).toBeVisible();
  await page.getByLabel('Choose a domain').selectOption('domain-1');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const wrong = page
    .getByRole('radio', { name: /Fixture alternative/ })
    .first();
  await wrong.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Submit answer' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Incorrect', exact: true }),
  ).toBeFocused();
  await expect(page.getByText(/^Correct answer:/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('feedback.png'),
    fullPage: true,
  });
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Change configuration' }).click();
  await expect(
    page.getByRole('heading', { name: 'Incorrect', exact: true }),
  ).toBeVisible();
  const leaveWarning = page.waitForEvent('dialog');
  const reload = page.reload();
  const dialog = await leaveWarning;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.accept();
  await reload;
  await expect(
    page.getByRole('heading', { name: 'Your next practice session' }),
  ).toBeVisible();
});

import { expect, test } from '@playwright/test';

test('exam supports skipping, revision, cancellation, unrestricted selections, and immutable results', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await page.getByLabel('Exam length', { exact: true }).selectOption('20');
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
  await page.getByLabel('Exam length', { exact: true }).selectOption('20');
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

test('mode navigation preserves cancelled sessions and warns before a reload discards an active exam', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await page.getByLabel('Exam length', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Practice', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: /Fixture target/ }),
  ).toBeChecked();
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
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Exam', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: /Fixture target/ }),
  ).toBeChecked();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', { name: 'Exam', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your next exam session', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  const warning = page.waitForEvent('dialog');
  const reload = page.reload();
  const dialog = await warning;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.accept();
  await reload;
  await expect(
    page.getByRole('button', { name: 'Start exam', exact: true }),
  ).toBeVisible();
});

for (const [count, minutes] of [
  [20, 30],
  [40, 65],
  [60, 95],
  [85, 130],
] as const) {
  test(`preset ${count}/${minutes} preserves answers and countdown across keyboard question-grid navigation`, async ({
    page,
  }, testInfo) => {
    await page.clock.install({ time: new Date('2026-11-10T10:00:00.000Z') });
    await page.clock.pauseAt(new Date('2026-11-10T10:00:01.000Z'));
    await page.addInitScript(() => {
      Math.random = () => 0.999;
    });
    await page.goto('/');
    const preset = page.getByLabel('Exam length', { exact: true });
    await expect(preset).toHaveValue('85');
    await preset.selectOption(String(count));
    await page.getByRole('button', { name: 'Start exam', exact: true }).click();
    await expect(page.getByLabel('Time remaining')).toHaveText(`${minutes}:00`);
    const grid = page.getByRole('navigation', {
      name: 'Exam questions',
      exact: true,
    });
    await expect(grid.getByRole('button')).toHaveCount(count);
    await expect(
      grid.getByRole('button', { name: 'Question 1, unanswered', exact: true }),
    ).toHaveAttribute('aria-current', 'step');
    await page.getByRole('radio', { name: /Fixture target/ }).check();
    await expect(
      grid.getByRole('button', { name: 'Question 1, answered', exact: true }),
    ).toBeVisible();
    await grid
      .getByRole('button', { name: 'Question 2, unanswered', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#exam-heading')).toBeFocused();
    const boxes = page.getByRole('checkbox');
    for (const box of await boxes.all()) await box.check();
    await expect(boxes).toHaveCount(6);
    await expect(
      grid.getByRole('button', { name: 'Question 2, answered', exact: true }),
    ).toBeVisible();
    await grid
      .getByRole('button', {
        name: `Question ${count}, unanswered`,
        exact: true,
      })
      .click();
    await expect(
      page.getByText(`Question ${count} of ${count}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Next question', exact: true }),
    ).toBeDisabled();
    await page.clock.fastForward(60_000);
    await grid
      .getByRole('button', { name: 'Question 2, answered', exact: true })
      .click();
    for (const box of await boxes.all()) await expect(box).toBeChecked();
    for (const box of await boxes.all()) await box.uncheck();
    await expect(
      grid.getByRole('button', { name: 'Question 2, unanswered', exact: true }),
    ).toBeVisible();
    await boxes.first().check();
    await grid
      .getByRole('button', { name: 'Question 1, answered', exact: true })
      .click();
    await expect(
      page.getByRole('radio', { name: /Fixture target/ }),
    ).toBeChecked();
    await expect(page.getByLabel('Time remaining')).toHaveText(
      `${minutes - 1}:00`,
    );
    await expect(page.locator('#exam-session-view .pill')).toHaveCount(0);
    await expect(page.getByText(/^Correct answer/)).toHaveCount(0);
    await expect(
      page.getByText(/This is synthetic interface test/),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.clock.fastForward(minutes * 60_000);
    await expect(
      page.getByRole('heading', { name: 'Exam complete', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Session counts')).toContainText(
      `Unanswered${count - 2}`,
    );
    await expect(page.getByLabel('Session counts')).toContainText('Attempted2');
    await page.clock.fastForward(60_000);
    await expect(page.getByLabel('Session counts')).toContainText('Attempted2');
    await page.getByRole('button', { name: 'Exam again' }).click();
    await expect(
      page.getByText(`Question 1 of ${count}`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Time remaining')).toHaveText(`${minutes}:00`);
    await page.getByRole('radio', { name: /Fixture target/ }).check();
    await page.screenshot({
      path: testInfo.outputPath(`exam-${count}-grid.png`),
      fullPage: true,
    });
  });
}

import { expect, test } from '@playwright/test';

test('a visitor completes ten unique questions, sees feedback and results, and restarts', async ({
  page,
}, testInfo) => {
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
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: testInfo.outputPath('question.png'),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Submit answer' }).click();
      await expect(page.getByRole('alert')).toHaveText(
        'Select an answer before submitting.',
      );
    }
    const answers = page.getByRole(
      (await page.getByRole('checkbox').count()) ? 'checkbox' : 'radio',
      { name: /Fixture target/ },
    );
    for (const answer of await answers.all()) {
      await answer.focus();
      await page.keyboard.press('Space');
    }
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(
      page.getByRole('heading', { name: 'Correct', exact: true }),
    ).toBeVisible();
    for (const answer of await answers.all())
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
  await page.screenshot({
    path: testInfo.outputPath('results.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Practice again' }).click();
  await expect(
    page.getByText('Question 1 of 10', { exact: true }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'End practice' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your next practice session' }),
  ).toBeVisible();
});

test('layout, incorrect feedback, keyboard focus, and leave warnings work', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'AWS Certified AI Business Strategist',
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start practice' }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath('homepage.png'),
    fullPage: true,
  });
  if (testInfo.project.name === 'mobile') {
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: testInfo.outputPath('wide-mobile-homepage.png'),
      fullPage: true,
    });
    await page.setViewportSize(viewport);
  }
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
  await page.getByRole('button', { name: 'End practice' }).click();
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

test('multiple-response checkboxes support empty rejection, all selections, locked feedback, and exact answers', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.getByRole('radio', { name: /Fixture target/ }).check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page
    .getByRole('button', { name: 'Next question', exact: true })
    .click();
  const boxes = page.getByRole('checkbox');
  await expect(boxes).toHaveCount(6);
  await expect(
    page.getByRole('group', { name: 'Answer options: select one or more' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Next question', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Select an answer before submitting.',
  );
  await expect(
    page.getByText('Question 2 of 10', { exact: true }),
  ).toBeVisible();
  await boxes.first().focus();
  await page.keyboard.press('Space');
  await expect(boxes.first()).toBeChecked();
  await page.keyboard.press('Space');
  await expect(boxes.first()).not.toBeChecked();
  for (const box of await boxes.all()) await box.check();
  await expect(
    page.getByRole('heading', { name: 'Incorrect', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(
    page.getByRole('heading', { name: 'Incorrect', exact: true }),
  ).toBeFocused();
  await expect(page.getByText(/^Correct answers:/)).toContainText(
    'Fixture target 2.1; Fixture target 2.3; Fixture target 2.5',
  );
  for (const box of await boxes.all()) {
    await expect(box).toBeChecked();
    await expect(box).toBeDisabled();
  }
  await expect(
    page.getByRole('button', { name: 'Submit answer' }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('multiple-feedback.png'),
    fullPage: true,
  });
  for (let index = 2; index < 10; index++) {
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
    for (const answer of await page
      .getByRole(index % 2 ? 'checkbox' : 'radio', { name: /Fixture target/ })
      .all())
      await answer.check();
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(
      page.getByRole('heading', { name: 'Correct', exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'See results', exact: true }).click();
  await expect(page.getByText('90%', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Session counts')).toContainText('Incorrect1');
});

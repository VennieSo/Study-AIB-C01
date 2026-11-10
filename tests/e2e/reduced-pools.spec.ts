import { expect, test } from '@playwright/test';

test('legitimate reduced pools disable only unsupported sizes and show actual counts', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Start exam', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('#exam-availability')).toContainText(
    'AI Governance and Responsible AI Leadership',
  );
  for (const option of await page
    .getByLabel('Exam length', { exact: true })
    .locator('option')
    .all())
    await expect(option).toBeDisabled();
  const scope = page.getByLabel('Choose a domain');
  const sizes = page.getByLabel('Question count');
  const start = page.getByRole('button', { name: 'Start practice' });
  await expect(page.locator('#availability')).toHaveText(
    '16 questions available. 10 will be sampled.',
  );
  await expect(sizes.locator('option[value="15"]')).toBeEnabled();
  await expect(sizes.locator('option[value="20"]')).toBeDisabled();
  await expect(sizes.locator('option[value="25"]')).toBeDisabled();
  await sizes.selectOption('15');
  await start.click();
  await expect(
    page.getByText('Question 1 of 15', { exact: true }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'End practice' }).click();
  await scope.selectOption('domain-2');
  await expect(start).toBeDisabled();
  await expect(page.locator('#availability')).toHaveText(
    '8 questions available. This scope needs at least 10 questions.',
  );
  await scope.selectOption('domain-3');
  await expect(start).toBeDisabled();
  await expect(page.locator('#availability')).toContainText(
    '0 questions available',
  );
  await scope.selectOption('all');
  await expect(sizes.locator('option[value="40"]')).toBeEnabled();
  await expect(sizes.locator('option[value="60"]')).toBeDisabled();
  await expect(sizes.locator('option[value="85"]')).toBeDisabled();
  await sizes.selectOption('40');
  await expect(page.locator('#availability')).toHaveText(
    '49 questions available. 40 will be sampled.',
  );
  await page.screenshot({
    path: testInfo.outputPath('reduced-pool-configuration.png'),
    fullPage: true,
  });
  await start.click();
  await expect(
    page.getByText('Question 1 of 40', { exact: true }),
  ).toBeVisible();
});

import { expect, test } from '@playwright/test';

test('built production HTML has SEO content and truthful unavailable sessions', async ({
  page,
}) => {
  const response = await page.goto('/');
  const html = await response!.text();
  expect(html).toContain('Study the strategy behind AI.');
  expect(html).toContain('name="description"');
  expect(html).toContain('AI Governance and Responsible AI Leadership');
  expect(html).not.toContain('synthetic-');
  expect(html).not.toContain('Fixture target');
  expect(html).not.toContain('Development preview');
  await expect(page).toHaveTitle(/Study AIB-C01/);
  for (const domain of [
    'all',
    'domain-1',
    'domain-2',
    'domain-3',
    'domain-4',
  ]) {
    await page.getByLabel('Choose a domain').selectOption(domain);
    await expect(
      page.getByRole('button', { name: 'Start practice' }),
    ).toBeDisabled();
    await expect(
      page.getByText(/0 questions available. This scope needs/),
    ).toBeVisible();
  }
});

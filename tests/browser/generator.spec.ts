import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createResult } from '@release-notes/shared';
import { getDemoResult } from '../../fixtures/demo';

test.beforeEach(async ({ page }) => {
  await page.route('**/health', (route) => route.fulfill({ json: { status: 'ok', liveEnabled: false } }));
});

test('demo is labeled, accessible, responsive, and exports exact Markdown', async ({ page }, testInfo) => {
  let generateCalls = 0;
  await page.route('**/api/generate', () => { generateCalls++; });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to generator' })).toBeFocused();
  await page.getByRole('button', { name: /Try Demo/ }).click();
  await expect(page.getByText('DEMO DATA', { exact: true })).toBeVisible();
  await expect(page.getByText(/No live repository retrieval or AI inference/)).toBeVisible();
  await expect(page.getByRole('article').getByRole('link')).toHaveCount(0);
  expect(generateCalls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('demo.png'), fullPage: true });
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByLabel('Markdown preview')).toHaveValue(getDemoResult().markdown);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { document.documentElement.dataset.copied = value; } } });
  });
  await page.getByRole('button', { name: 'Copy Markdown' }).click();
  await expect(page.getByRole('status')).toContainText('Markdown copied');
  expect(await page.evaluate(() => document.documentElement.dataset.copied)).toBe(getDemoResult().markdown);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .md' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('demo-release-notes-v1.3.0.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe(getDemoResult().markdown);
});

test('mocked generation shows partial coverage and correct source links', async ({ page }) => {
  const fixture = getDemoResult();
  const result = createResult({ ...fixture, mode: 'live', comparison: { ...fixture.comparison, totalCommits: 30, truncated: true } });
  await page.route('**/api/generate', (route) => route.fulfill({ json: result }));
  await page.goto('/');
  await page.getByLabel('GitHub repository URL').fill('https://github.com/demo/release-toolkit');
  await page.getByLabel('Base reference').fill('v1.2.0');
  await page.getByLabel('Head reference').fill('v1.3.0');
  await page.getByRole('button', { name: 'Generate Release Notes' }).click();
  await expect(page.getByText('LIVE AI DRAFT')).toBeVisible();
  await expect(page.getByText(/Partial coverage: 4 of 30/)).toBeVisible();
  await expect(page.getByRole('article').getByRole('link', { name: '1111111' }).first()).toHaveAttribute('href', 'https://github.com/demo/release-toolkit/commit/' + '1'.repeat(40));
});

test('mocked quota failure and hostile model text are handled safely', async ({ page }) => {
  await page.route('**/api/generate', (route) => route.fulfill({ status: 429, json: { error: { code: 'AI_QUOTA_EXHAUSTED', message: 'Free AI allocation exhausted. Try Demo.' } } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Try Demo/ }).click();
  await page.getByRole('button', { name: 'Generate Release Notes' }).click();
  await expect(page.getByRole('alert')).toContainText('Free AI allocation exhausted');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.unroute('**/api/generate');
  const fixture = getDemoResult();
  const hostile = '<img src=x onerror="window.pwned=true">';
  fixture.entries[0]!.text = hostile;
  fixture.entries[0]!.evidence[0]!.quote = hostile;
  fixture.sources[0]!.message = hostile;
  const result = createResult({ ...fixture, mode: 'live' });
  await page.route('**/api/generate', (route) => route.fulfill({ json: result }));
  await page.getByRole('button', { name: 'Generate Release Notes' }).click();
  await expect(page.getByRole('article')).toContainText(hostile);
  await expect(page.locator('article img')).toHaveCount(0);
  expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
});

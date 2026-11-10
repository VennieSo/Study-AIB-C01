import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { syntheticBank } from './fixtures/questions';
import { publicBanks } from '../src/data/public-banks';

const directories: string[] = [];
afterEach(() =>
  directories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    ),
);

function artifact() {
  const directory = mkdtempSync(join(tmpdir(), 'aib-public-artifact-'));
  directories.push(directory);
  writeFileSync(
    join(directory, 'index.html'),
    `<!doctype html><script id="question-data" type="application/json">${JSON.stringify(Object.values(publicBanks).flatMap((bank) => bank.questions))}</script>`,
  );
  writeFileSync(
    join(directory, 'favicon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
  );
  return directory;
}

function validate(directory: string, ...arguments_: string[]) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/validate-assets.ts',
      '--directory',
      directory,
      ...arguments_,
    ],
    { encoding: 'utf8' },
  );
}

test('deployment refuses an unintended public file instead of publishing the whole output directory', () => {
  const directory = artifact();
  mkdirSync(join(directory, 'notes'));
  writeFileSync(
    join(directory, 'notes', 'draft.txt'),
    'Not intended for the public site',
  );
  const result = validate(directory);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('not allowed');
});

test('production refuses a synthetic question payload even when it has an allowed filename', () => {
  const directory = artifact();
  writeFileSync(
    join(directory, 'index.html'),
    `<script id="question-data" type="application/json">${JSON.stringify(syntheticBank(12, 'mixed').questions)}</script>`,
  );
  const result = validate(directory);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('public question banks');
});

test('explicit synthetic preview accepts only its labelled fixture content', () => {
  const directory = artifact();
  writeFileSync(
    join(directory, 'index.html'),
    `<meta name="robots" content="noindex, nofollow"><p>Development preview · synthetic questions</p><script id="question-data" type="application/json">${JSON.stringify(syntheticBank(12, 'mixed').questions)}</script>`,
  );
  const result = validate(directory, '--fixtures');
  expect(result.status, result.stderr).toBe(0);
});

test('synthetic preview refuses fixture data without a visible notice and noindex metadata', () => {
  const directory = artifact();
  writeFileSync(
    join(directory, 'index.html'),
    `<script id="question-data" type="application/json">${JSON.stringify(syntheticBank(12, 'mixed').questions)}</script>`,
  );
  const result = validate(directory, '--fixtures');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('labelled');
});

test('deployment rejects credential material inside an otherwise allowed browser asset', () => {
  const directory = artifact();
  mkdirSync(join(directory, '_astro'));
  writeFileSync(
    join(directory, '_astro', 'index.abcdefgh.js'),
    'const key = "-----BEGIN PRIVATE KEY-----";',
  );
  const result = validate(directory);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('credential');
  expect(result.stderr).not.toContain('BEGIN PRIVATE');
});

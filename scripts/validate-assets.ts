import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { publicBanks } from '../src/data/public-banks';
import { loadQuestionBanks } from '../src/lib/questions';

const { values } = parseArgs({
  options: {
    directory: { type: 'string' },
    fixtures: { type: 'boolean', default: false },
  },
});
const directory = resolve(
  values.directory ?? (values.fixtures ? '.qa-dist' : 'dist'),
);

// Shared assets for both builds. Production also serves the Google verification file.
const allowed =
  /^(?:index\.html|aib-c01-exam-facts\/index\.html|about\/index\.html|404\.html|_redirects|_headers|robots\.txt|sitemap\.xml|og-home\.png|favicon\.svg|_astro\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.[A-Za-z0-9_-]+\.(?:js|css|woff2))$/;
const publicDirectories = new Set(['_astro', 'aib-c01-exam-facts', 'about']);
const verificationFile = 'googlee0841d149f9fdcc6.html';
const credential =
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b|(?:CLOUDFLARE_API_TOKEN|oauth_token|refresh_token|api[_-]?secret|api[_-]?token)\s*["']?\s*[:=]\s*["'][^"']{8,}["']/i;
// Local paths, dev-server markers and source maps must never ship.
const localEnvironment =
  /\/(?:Users|home)\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\|file:\/\/|data-vite-dev-id|data-astro-source-|\/@vite\/|\/@fs\/|sourceMappingURL|\b(?:localhost|127\.0\.0\.1):\d+/;
async function inspect(relative = ''): Promise<void> {
  for (const entry of await readdir(resolve(directory, relative), {
    withFileTypes: true,
  })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory() && publicDirectories.has(path)) await inspect(path);
    else {
      const isVerificationFile = !values.fixtures && path === verificationFile;
      if (!entry.isFile() || (!allowed.test(path) && !isVerificationFile))
        throw new Error(`Public asset not allowed: ${path}`);
      if (!/\.(?:woff2|png)$/.test(path)) {
        const content = await readFile(resolve(directory, path), 'utf8');
        if (
          isVerificationFile &&
          content.trimEnd() !== `google-site-verification: ${verificationFile}`
        )
          throw new Error(
            'Google verification file content does not match its filename.',
          );
        if (credential.test(content))
          throw new Error(`Possible credential in public asset: ${path}`);
        if (localEnvironment.test(content))
          throw new Error(`Local environment detail in public asset: ${path}`);
        if (
          !values.fixtures &&
          /synthetic-|Synthetic fixture|Fixture target|Development preview/.test(
            content,
          )
        ) {
          throw new Error(
            `Production allows only public question banks; synthetic fixture content is not allowed: ${path}`,
          );
        }
      }
    }
  }
}

try {
  await inspect();
  const html = await readFile(resolve(directory, 'index.html'), 'utf8');
  const payload = html.match(
    /<script\b[^>]*\bid="question-data"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  const expected = values.fixtures
    ? loadQuestionBanks(
        (await import('../tests/fixtures/questions')).syntheticBanks(),
      )
    : loadQuestionBanks(publicBanks);
  if (
    !payload ||
    JSON.stringify(JSON.parse(payload)) !== JSON.stringify(expected)
  ) {
    throw new Error(
      values.fixtures
        ? 'Preview content must match synthetic fixtures exactly.'
        : 'Production content must match the public question banks exactly.',
    );
  }
  if (
    values.fixtures &&
    (!html.includes('Development preview · synthetic questions') ||
      !/<meta\s+name="robots"\s+content="noindex, nofollow"\s*\/?>/.test(html))
  ) {
    throw new Error(
      'Synthetic preview must be visibly labelled and have noindex metadata.',
    );
  }
  console.log('Static public asset allowlist passed.');
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Public asset validation failed.',
  );
  process.exitCode = 1;
}

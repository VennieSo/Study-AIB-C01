# Initial release verification

The initial release contains 135 original AI-generated practice
questions following AWS formats. The project is unofficial and has no AWS
endorsement. Raw results are not an official score or readiness prediction.

## Publication status

Published on 2026-11-15 at **https://study-aib-c01.bigthink.workers.dev** through the separate `study-aib-c01` Worker. The synthetic preview remains at `https://study-aib-c01-preview.bigthink.workers.dev`.

The first production release is commit `4a26d5c115b0d0673c2e0ed498369349bdeb02f7`. Its [push-triggered production run](https://github.com/VennieSo/Study-AIB-C01/actions/runs/43683723080) passed all checks, deployed the initial bank, compared deployed HTML with the build, and passed 20 live desktop/mobile Chrome journeys. The [parallel integration run](https://github.com/VennieSo/Study-AIB-C01/actions/runs/43683722965) verified and deployed the separate synthetic preview.

An additional 20 live WebKit desktop/mobile journeys passed against the production URL. All eight public assets returned HTTPS 200 and matched the checked local build byte for byte. Browser checks reported no console, page or network errors.

## Reproduce the checks

Use Node 24.22.3 or newer and npm 10 or newer:

```sh
npm ci
npm run check
npm test
npm run validate:launch
npm run test:e2e
npm run deploy:dry-run
```

The browser suite builds both production and synthetic preview artifacts. The
production projects exercise the actual public bank at desktop and 320px mobile
widths. `validate:assets` checks an explicit public-file allowlist, exact bank
payload equality, fixture exclusion and common credential patterns. These are
scoped checks, not proof that every possible secret or content defect is absent.

After deploying the same built commit, run:

```sh
LIVE_BASE_URL=https://your-production-hostname npm run test:live
```

This command requires an HTTPS URL and starts no local servers. It runs the same
production browser journeys against the deployed site, compares every downloaded
public asset with `dist/`, and fails on browser console, page or network errors.
Build locally from the deployed commit first; mismatched files intentionally fail.
The production GitHub Actions step runs this command after verifying the deployed
HTML. Screenshots and failure traces are written under ignored `test-results/`.

## Browser coverage

Final local verification on 2026-11-15 passed 137 unit/content/session tests, all 66 browser cases, the 135-question launch validator, both static builds and artifact allowlists, and both Wrangler deployment dry runs. Astro and TypeScript checks reported zero errors, warnings or hints. The full browser matrix includes development, reduced pools, static preview, and canonical production at desktop and 320px mobile widths. Supplementary WebKit checks passed 20 local and 20 live production journeys.

- Every Practice scope and size; all four Exam presets; actual bank availability
  and exact canonical payload; static homepage copy and metadata.
- Practice completion, immediate explanations, exact answers, empty multiple
  submission rejection, every-checkbox selection, incorrect exact-set score,
  locked submitted answers and replay.
- Exam countdowns, keyboard question-grid navigation and heading focus, retained
  answers and original timer, cancellation of manual submission, unanswered
  submission, immutable final answer review and replay.
- Exam unrestricted multiple selections, clear/revision, a partial set earning
  zero, delayed deadline expiry without confirmation and unanswered results.
- Session-end cancellation, mode change confirmation, direct homepage fragment
  navigation, reload warning and loss of active progress, mobile overflow checks.
- All built public assets return 200 and match the build byte for byte; live URLs
  remain HTTPS. There are no client routes requiring server rewrites.

Other public-interface tests verify weighted no-repeat sampling, JSON
serialization/continuation, snapshot preservation, malformed-record rejection and
restoration with the original absolute deadline. Persistence remains deferred:
there is no localStorage resume or history; refresh/close loses active sessions.

Local browser versions were Chrome 157.0.8103.51 and WebKit 27.2, using Node 22.23.4.

Mobile checks use Chrome and WebKit emulation; they do not verify native Safari or physical devices. Downloadable
answer keys are intentional in this static study tool. Structural and journey
checks do not establish factual correctness of every question.

## Release measurements

The verified production build contains eight public files:

| Artifact                                       | Uncompressed bytes | gzip bytes |
| ---------------------------------------------- | -----------------: | ---------: |
| Homepage HTML (including public question data) |            306,419 |     91,440 |
| Browser JavaScript (three files)               |            289,431 |     81,935 |
| Stylesheet                                     |             21,893 |      5,045 |
| Fonts (two files)                              |             75,604 |     75,625 |
| Favicon                                        |                286 |        216 |
| **Total**                                      |            693,633 |    254,261 |

These are artifact bytes and a full download without cache. Actual transfer depends on host compression and caching. gzip sizes are measured per file, including already compressed fonts. Historical synthetic-preview evidence is in the [contributor guide](../development.md).

## Public information checks

The source repository is public. Tracked files and Git history were scanned for scoped patterns for common credentials and unintended public information; no matches were found outside deliberate detector-test literals. All 13 surviving public issue bodies, comments and available edit histories (42 texts, with no unread pages) were checked with the same scoped patterns; no matches were found. Ignored local files are not tracked or deployed. These checks do not establish that every possible disclosure is absent. Production artifact checks also require exact canonical-bank payload equality and reject fixture markers and unexpected assets.

## Standards

The independent review found two issues, both fixed and verified: selected multiple-response Practice text now follows the documented feedback colors, and both session modes share the unchanged question-revision helper. No open Standards findings remain.

## Spec

The independent review found no functional gaps against #1, the revised 135-question requirement in #9, and the version-2 skill contract in #18. The owner requested a user-facing README; technical guidance is retained in the linked contributor guide. No open Spec findings remain.

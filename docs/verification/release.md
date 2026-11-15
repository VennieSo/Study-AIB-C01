# Initial release verification

The release candidate contains 135 initial, original AI-generated practice
questions following AWS formats. The project is unofficial and has no AWS
endorsement. Raw results are not an official score or readiness prediction.

## Publication status

Production publication and live verification are pending. A local build or a
successful synthetic preview deployment does not demonstrate the production
release. Record the real HTTPS URL, source commit and successful push-triggered
GitHub Actions run here after production verification.

## Reproduce the checks

Use Node 22.23.4 or newer and npm 10 or newer:

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

Local verification on 2026-11-15 passed all 20 production browser cases across
desktop Chrome and a 320px mobile viewport in 24.7 seconds, including server/build
startup. Type checking also passed with zero errors, warnings or hints. These
results precede production deployment; live evidence remains pending above.

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

Chrome mobile emulation does not verify Safari or physical devices. Downloadable
answer keys are intentional in this static study tool. Structural and journey
checks do not establish factual correctness of every question.

## Release measurements

The 2026-11-15 release-candidate build contains eight public files:

| Artifact                                       | Uncompressed bytes |  gzip bytes |
| ---------------------------------------------- | -----------------: | ----------: |
| Homepage HTML (including public question data) |            306,419 |      91,441 |
| Browser JavaScript (three files)               |            289,810 |      82,111 |
| Stylesheet                                     |             21,727 |       5,027 |
| Fonts (two files)                              |             75,604 |      75,625 |
| Favicon                                        |                286 |         216 |
| **Total**                                      |        **693,846** | **254,420** |

These represent artifact bytes and a full download without cache; actual network
transfer depends on the host's compression and cache policy. gzip sizes were
measured per file, including already compressed fonts. Refresh measurements if
production source changes. Record final check counts and the verified browser
version alongside deployment evidence. Historical synthetic-preview results in
the README are separate from this production release.

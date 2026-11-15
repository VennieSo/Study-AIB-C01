# Initial question bank integration

The initial production bank contains 135 canonical questions across four
schema-version-2 files:

| Domain | Questions |
| --- | ---: |
| 1 | 34 |
| 2 | 33 |
| 3 | 32 |
| 4 | 36 |

All 58 official primary skills are represented. Each question retains its stable
ID, classification, option IDs, correct answer set, wording, and explanation.

The launch gate requires at least 25 questions per domain. There is no maximum
bank size or equal-domain-count requirement. Session sizes remain unchanged.
Production uses the existing public-bank loader, sampling, scoring, and session
records; development and explicit preview builds continue to use fixtures.

## Checks

Verified on 2026-11-15: `npm run check`, 137 unit tests, 52 browser tests,
`npm run validate:launch`, and the production build all passed. Browser tests
cover Chrome desktop and an emulated mobile viewport, not physical devices.

- JSON Schema and semantic validation: 135 valid questions, unique IDs, valid
  domain/task/skill relationships, required text, option and answer invariants.
- Public session interfaces: all 20 Practice scope/size combinations and all four
  weighted Exam presets, no repeated IDs, canonical snapshots and explanations,
  completion and raw scores.
- Production browser journeys: every Practice configuration, Practice feedback
  and completion, all four Exam presets, submitted answers and answer review.
- Production build: embedded payload matches the canonical public banks exactly;
  static asset allowlist, synthetic-content exclusion and credential-pattern scan.

Answer keys and explanations are embedded in the static HTML and downloadable
by visitors. These checks verify integration, not factual correctness of content.
This integration does not itself publish a deployment.

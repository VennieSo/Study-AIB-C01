# AIB-C01 Practice

A free, unofficial study site for **AWS Certified AI Business Strategist (AIB-C01)**.
Initial, original AI-generated practice questions follow AWS question formats.
This project has no AWS affiliation or endorsement.

This first slice implements an untimed, ten-question, single-domain Practice
session: select an answer, submit for immediate feedback and an explanation,
finish with raw results, and start another randomized session. Questions do not
repeat within a session. Submitted answers are locked.

**Status:** local implementation; no live deployment yet. The public question
banks are currently empty, so production correctly disables Practice. Development
uses clearly labelled synthetic interface fixtures, which do not assess exam
knowledge and never become production question data. More session sizes,
multiple-response Practice, and Exam Mode are later slices.

## Screenshots

Development preview using labelled synthetic interface fixtures:

![Desktop homepage](docs/screenshots/development-homepage.png)

<img src="docs/screenshots/development-mobile-feedback.png" alt="Mobile Practice showing an incorrect answer, correct answer and explanation using synthetic interface fixtures" width="320" />

## Local development

Use Node **22.23.4 or newer** and npm 10 or newer. `.nvmrc` pins a compatible
runtime; if you use nvm, run `nvm install` and `nvm use` first.

```sh
npm ci
npm run dev
```

Open the printed local URL (normally `http://localhost:4321`). Choose the first
domain, then **Start practice**. Development provides twelve synthetic questions
from which each session samples ten. Other domains truthfully show no availability.
Use Tab, arrow keys, and Space to select an answer, then submit. Next unlocks only
after feedback. Results show total, attempted, correct, incorrect, unanswered, and
the raw percentage against the whole session.

Sessions live in tab memory. Refreshing or closing loses progress; supported
browsers warn before leaving an active session. Changing configuration asks before
discarding an active session. There are no accounts, saved history, or resume after
reload.

```sh
npm run check             # Astro diagnostics and strict TypeScript
npm test                 # Content and session public-interface tests
npm run test:e2e          # Chrome desktop, mobile viewport, built production
npm run build            # Validate public content, build static dist/
npm run preview          # Inspect the production build, not the fixture bank
```

Browser tests use installed Google Chrome. On a CI machine without Chrome, install
it first with `npx playwright install chrome`. Mobile tests emulate an iPhone-sized
viewport in Chromium; they do not replace testing Safari or an actual iOS device.
The end-to-end suite starts its own development and production servers on ports
4321 and 4322. It also writes screenshots to the ignored `test-results/` directory.

An explicitly synthetic static build is available with `npm run build:fixtures`.
It writes to **`.qa-dist/`**, separate from production `dist/`, and includes a
development notice and `noindex` metadata. Do not deploy `.qa-dist/` as production.

## Architecture

- `src/pages/index.astro`: meaningful static homepage HTML, metadata, domain
  information, and session configuration. Edit homepage copy in `src/content/site.ts`.
- `src/lib/exam-scope.ts`: shared official domain/task registry, in guide order.
- `src/lib/questions.ts`: canonical JSON Schema validation plus cross-record and
  content invariants; single-answer Practice eligibility and launch-count checks.
- `src/data/load-bank.ts`: build-time choice of public banks or development fixtures.
  Rendering and session rules do not load content themselves.
- `src/lib/session.ts`: DOM-free Practice rules, injected randomness/clock/storage,
  versioned session validation, and the in-memory storage adapter.
- `src/scripts/practice.ts`: browser events, focus, and leave warnings.
- `src/scripts/render-session.ts`: escaped HTML presentation of question, feedback,
  and summary state. Content is rendered as plain text, not interpreted HTML.

`PracticeSession.start(domainId, questions, dependencies)` creates a session.
`select`, `submit`, `next`, and `abandon` enforce its lifecycle. `record` returns a
defensive JSON-serializable copy; `result()` reports counts and percentage.
`PracticeSession.restore(record, dependencies)` validates a record before allowing
continuation. Invalid records fail rather than silently reset or repair themselves.

Version-1 records include the session ID, mode/configuration, ordered question
snapshots with SHA-256 content revisions, domain/task metadata, selections,
submission times, feedback, current index, lifecycle, and start/update/completion
timestamps. `deadlineAt` is reserved and must be `null` for untimed Practice. Exam
behavior is not implemented in this slice. The bank can change without changing
an existing session's snapshots or results.

`SessionStorage` exposes `save(record)` and `load(id)`. `MemorySessionStorage`
keeps independent copies of active, completed, and abandoned records for the tab's
lifetime. A future persistent adapter can use the same record and rules; this
release exposes no persistence or history UI.

## Public question contract

Store one version-1 JSON bank per domain in `src/data/questions/domain-N.json`:
an object with `schemaVersion: 1` and a `questions` array. The authoritative format
is [question-bank.schema.json](docs/agents/question-bank.schema.json).

Every question has `id`, `domainId`, `taskId`, `type`, `text`, stable `options`,
`correctOptionIds`, and `explanation`. `topic` and official public AWS `references`
are optional. Domain and task IDs must belong together. Single-answer records
have four options and one correct answer; multiple-response records have at least
five options and two correct answers. The content loader supports both types;
this slice's session selector only offers single-answer questions.

Validation rejects extra fields, blank required text, wrong task/domain pairings,
mixed-domain files, duplicate question IDs across files, duplicate option IDs,
invalid answer membership/cardinality, and unsafe/non-AWS reference URLs. Smaller
valid pools are allowed; unsupported sessions are disabled instead of shortened.

```sh
npm run validate:content  # Structural and semantic validation; allows small pools
npm run validate:launch   # Also requires exactly 25 questions in each domain
```

The launch check intentionally fails until all four public banks reach 25
questions each. The production build uses only the public bank and does not
fall back to fixtures when content is missing. Answer keys are downloadable in
this static study tool by design.

## Build and deployment boundary

`npm run build` emits only static files in `dist/`; no server, database,
authentication, or runtime AI is needed. Cloudflare Workers Static Assets and
automatic deployment are planned in a later issue. When hosting is configured,
use Node 22.23.4+, `npm ci`, `npm run check`, and `npm run build`, with `dist/` as
the assets directory. Publish only the production output. No hosting resources
are provisioned by this slice.

## Sources and limitations

The shared scope labels follow the [official AIB-C01 exam guide](https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html).
The interface shows raw practice percentages, with equal question weight. It
offers no AWS scaled score, passing threshold, endorsement, or readiness prediction.
Future multiple-response scoring requires an exact set match without limiting
student selection counts. Exam timers, review, and other presets remain future work.

The automated journeys cover Chrome desktop and a mobile viewport, keyboard
selection/focus, both feedback outcomes, answer locks, no repeats, reload warnings,
results/restart, production empty availability, and built homepage SEO. The session
tests cover JSON round-trip/continuation and malformed-record rejection.

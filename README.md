# Angular Firebase PWA Playground

A template repo for trying out Angular and Firebase updates and prototyping future PWA projects. The stack is Angular, the native Firebase SDK, Firebase emulators, Testing Library, GitHub Actions and FTP deploy.

**Status:** planning only. The code is built by working through the tickets in `.scratch/baseline/issues/`.

## Project Setup
  run `npx skills install` to add skills referenced in `skills-lock.json`

## Development

Needs Node 24 (`.nvmrc`) and Java 21+ for the Firebase emulators. No Firebase project or credentials are needed: development runs against the `demo-playground` emulators.

| Command | What it does |
|---|---|
| `npm start` | Starts the Auth, Firestore and Storage emulators with the Emulator UI (http://localhost:4000), seeds them, then serves the app (http://localhost:4200). |
| `npm test` | Component tests. No emulators needed. |
| `npm run test:integration` | Integration tests (`*.integration.spec.ts`) inside the emulators. |
| `npm run seed` | Runs every seeder in `scripts/seed/`. Only works inside the emulators; `npm start` calls it. |

Production builds need the production project's web config in `src/environments/environment.ts`. While it still holds the `REPLACE_ME` placeholder, the app throws at startup instead of failing later on its first Firebase call.

## How this repo was planned

Planning was done in a conversation with Claude Code, using [Matt Pocock's agent skills](https://github.com/mattpocock/skills). Each step used one skill:

1. **Grill the idea**: [`/grill-with-docs`](https://aihero.dev/skills-grill-with-docs). It combines two skills:
   - [grilling](https://aihero.dev/skills-grilling): the agent asks numbered questions in rounds, each with a recommended answer. I accept or override each one, and the next round builds on the answers. This continues until every design decision is settled.
   - [domain-modeling](https://aihero.dev/skills-domain-modeling): while grilling, the agent records domain terms in a glossary. It writes an ADR for any decision that is hard to reverse, surprising, and the result of a real trade-off.
2. **Configure the skills**: [`/setup-matt-pocock-skills`](https://aihero.dev/skills-setup-matt-pocock-skills). This tells the other skills where issues live (local markdown files), which triage labels to use, and where the domain docs are.
3. **Write the spec**: [`/to-spec`](https://aihero.dev/skills-to-spec). The agent turns the conversation into a spec without asking anything new. The only check-in was agreeing the test seams.
4. **Break it into tickets**: [`/to-tickets`](https://aihero.dev/skills-to-tickets). The agent splits the spec into vertical "tracer bullet" slices, each with its blocking tickets. We iterated on size and dependencies, then published one file per ticket.

Next step: implement the tickets in order, e.g. with [`/tdd`](https://aihero.dev/skills-tdd).

## Planning documents

| File | Meaning |
|---|---|
| `README.md` | This file: the planning process for humans. |
| `CONTEXT.md` | Domain glossary (**Playground**, **Template**, **Baseline**, **Prototype**). Terms only, no implementation details. |
| `docs/adr/0001-native-firebase-sdk-instead-of-angularfire.md` | Why the native Firebase SDK is used instead of AngularFire: Angular updates shouldn't wait on a wrapper library. |
| `docs/adr/0002-ftp-deploy-instead-of-firebase-hosting.md` | Why the app is deployed by FTP to existing webspace, and what that means (static build, `.htaccess`, Google sign-in by popup only). |
| `docs/adr/0003-lazy-firestore-loader-token.md` | Why the `FIRESTORE` token gives a loader instead of an instance: the Firestore SDK stays out of the initial bundle. |
| `AGENTS.md` | Entry point that tells AI agents how to use the skills in this repo. |
| `docs/agents/issue-tracker.md` | Issues are local markdown files under `.scratch/<feature>/`. |
| `docs/agents/triage-labels.md` | The triage labels, stored on each issue's `Status:` line. |
| `docs/agents/domain.md` | Where agents find the glossary and ADRs, and how to use them. |
| `.scratch/baseline/spec.md` | The Baseline spec: problem, user stories, implementation and testing decisions, out of scope. |
| `.scratch/baseline/issues/01-…09-*.md` | Nine tickets in dependency order, each with acceptance criteria and its "Blocked by" tickets. |

## Skill sources

- Repository: [github.com/mattpocock/skills](https://github.com/mattpocock/skills)
- Skill descriptions: `https://aihero.dev/skills-<skill-name>`, e.g. [grilling](https://aihero.dev/skills-grilling), [domain-modeling](https://aihero.dev/skills-domain-modeling), [to-spec](https://aihero.dev/skills-to-spec), [to-tickets](https://aihero.dev/skills-to-tickets)
- Installed here as the Claude Code plugin `mattpocock-skills` from the official plugin marketplace.

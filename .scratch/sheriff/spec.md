# Spec: Sheriff enforces the Baseline/Feature import rules

**Status:** resolved

## Problem Statement

`CONTEXT.md` and `docs/features.md` define how the Baseline and the Features may depend on each other: the Baseline never depends on a Feature, no Feature depends on another, and only the Feature route list reaches into a Feature, with only the app routes and home reading that list. Nothing checks these rules. A stray import from a Baseline folder into a Feature, or from one Feature into another, passes lint, tests and build, and is only caught if a reviewer notices. In a project created from the Template, where Features are the product and grow quickly, that drift is likely, and once it's there "deleting a Feature leaves the Baseline intact" stops being true.

The Baseline's own layering (Firebase wiring and browser helpers at the bottom, then auth, then Live data, then the profile) and the rule that production code never imports test helpers are just as unchecked.

## Solution

Add Sheriff (`@softarc/sheriff-core` and `@softarc/eslint-plugin-sheriff`) to the existing ESLint setup, with a config that turns each Baseline folder, the environments, the test helpers, the Feature route list and each Feature folder into a Sheriff module with dependency rules between them. `npm run lint`, which CI already runs, then fails on any import that breaks the rules, naming both modules.

Developers notice no change when they follow the rules. A new Feature folder is picked up automatically. A new Baseline folder needs one config entry, and the config says so.

The decision and its limits are recorded in ADR 0005, and `docs/features.md` says which of its rules lint now enforces.

The glossary change in `CONTEXT.md` (the **Feature route list** term, and the Baseline reaching Features only through it) was made during the grilling session and lands with this spec.

## User Stories

1. As a developer, I want lint to fail when a Baseline file imports a Feature, so that the Baseline provably never depends on a Feature.
2. As a developer, I want lint to fail when one Feature imports another, so that each Feature can be deleted on its own.
3. As a developer, I want lint to fail when a Feature imports the Feature route list or home, so that no import cycle Feature → home → route list → Feature can form, which Sheriff can't detect as a cycle.
4. As a developer, I want lint to fail when any file other than the app routes or home imports the Feature route list, so that the seam between Baseline and Features stays at two known importers.
5. As a developer, I want the Feature route list to be the only module allowed to import a Feature, so that every Feature is reached through its route entry.
6. As a developer, I want lint to fail when production code imports the test helpers, so that fakes and emulator setup never reach the bundle.
7. As a developer, I want the test helpers unable to import a Feature or the Feature route list directly, so that `renderApp` keeps no Feature defaults.
8. As a developer, I want the test helpers to keep importing the app shell and routes, so that `renderApp` renders the real app.
9. As a developer, I want spec files allowed to import the test helpers, the environments and any Baseline module, so that today's specs pass without per-folder exceptions.
10. As a developer, I want a Baseline spec that imports a Feature's fake to fail lint, so that the Baseline's tests never depend on a Feature.
11. As a developer, I want a Feature's own specs to keep using that Feature's fake, so that the fake stays inside the Feature and goes with it on deletion.
12. As a developer, I want the Baseline layering enforced (Firebase wiring and browser helpers import no app module; auth only those two; Live data only auth and Firebase wiring; the profile only Live data and Firebase wiring; PWA only browser helpers; home only auth and the Feature route list), so that lower layers never reach up.
13. As a developer, I want the environments importable only by the app shell, the test helpers and spec files, so that Baseline code keeps getting settings through DI.
14. As a developer building a Feature, I want to use every Baseline module except home, so that a Feature can read the profile, use the PWA helpers or reload the page without a config change.
15. As a developer adding a Feature, I want its folder picked up as a Sheriff module with no config change, so that the rules cover it from its first file.
16. As a developer adding a Feature, I want `docs/features.md` to tell me the folder name must be lowercase letters and hyphens only, so that it isn't silently left out of the checks.
17. As a developer adding a Baseline folder, I want a warning in the Sheriff config telling me to add it to the modules and to the Feature allowance, so that I don't break lint or lock Features out of it.
18. As a developer adding a Baseline folder and forgetting the config entry, I want lint to fail loudly when any Baseline module imports it, so that the omission can't go unnoticed.
19. As a developer, I want violations reported by `npm run lint` in my editor and in CI, so that I don't need a separate command.
20. As a developer, I want spec files and test helpers checked too, so that the rules hold for all code ESLint sees, not just files reachable from `main.ts`.
21. As a developer, I want type-only imports and dynamic `import()` checked like static imports, so that neither is a loophole.
22. As a developer, I want no `index.ts` barrels introduced, so that no barrel can pull Firestore into eager code (ADR 0003).
23. As a developer, I want every file to stay importable by allowed modules for now, so that this change adds dependency rules only and moves no files.
24. As a developer reading lint output, I want the module tags to use the glossary's words (Baseline, Feature, Feature route list), so that a violation message reads like the docs.
25. As a developer, I want `docs/features.md` to say that `npm run lint` enforces the rules in "The features folder", so that I know they're checked.
26. As a developer, I want `docs/features.md` to say that the lazy-`import()` rule and keeping Firestore out of eager code are still checked only by review and the bundle budget, so that I don't assume lint covers them.
27. As a future reader, I want ADR 0005 to explain why barrel-less modules, one tag per folder and one spec exemption rule were chosen, so that I don't undo them without knowing the trade-offs.
28. As a future reader, I want ADR 0005 to list what Sheriff doesn't check (cycles, third-party imports such as Firestore, static vs dynamic imports) and that Features have no shared area yet, so that the gaps are known.
29. As a maintainer, I want both Sheriff packages pinned to the same exact version, so that the plugin and the core it pins never drift apart.
30. As a maintainer, I want Dependabot's existing `other` group to update both packages together, so that upgrades need no extra setup.
31. As a maintainer, I want the lint time before and after recorded, so that I know what the checks cost.
32. As a project created from the Template, I want the rules to come with the Template, so that its Features start out isolated.
33. As an agent, I want the Sheriff config to be the single place module boundaries are defined, so that I can read the allowed dependencies in one file.

## Implementation Decisions

- **Packages.** `@softarc/sheriff-core` and `@softarc/eslint-plugin-sheriff` as dev dependencies, both pinned to exactly `0.20.0` (no range). Compatible with this repo's ESLint 10, TypeScript 6.0, typescript-eslint 8, Angular 22.2 and angular-eslint 22.5: Sheriff's own repo runs that stack and ships a near-identical Angular fixture. Neither package needs install scripts, so CI's `npm ci --ignore-scripts` is fine.
- **ESLint.** One extra block in the flat config, scoped to `**/*.ts`, that extends `sheriff.configs.all` (rules `dependency-rule` and `encapsulation`). `ng lint` already lints `src/**/*.ts`, so specs and test helpers are checked; no `angular.json` or CI change. The Sheriff config sits at the repo root next to the root `tsconfig.json` (where Sheriff looks for it) and is outside what `ng lint` lints.
- **Barrel-less modules.** `enableBarrelLess: true`, no `index.ts` anywhere. Barrels would risk pulling Firestore into eager code (ADR 0003) and would block the test helpers' import of the app shell unless every check on the app shell were switched off. `autoTagging: false`, so a stray `index.ts` fails instead of becoming an untagged module.
- **One tag per folder.** Each Baseline folder gets `baseline:<folder>`; the environments get `env`; the test helpers `testing`; the Feature route list's folder `feature-route-list`; each Feature folder `feature`. The Baseline is flat folders with no layers inside, so a scope × layer matrix would need invented layer names; switching later moves no files. The test helpers count as Baseline but get their own tag so that production code can't import them.
- **Spec exemption.** One `'*'` rule: a `*.spec.ts` file may also import `testing`, `env` and any `baseline:*` module. A Feature's fake stays inside the Feature, so only that Feature's specs (same module, never checked) use it.
- **Feature allowance.** Every Baseline module except home, listed explicitly. Home imports the Feature route list, so allowing it would close a cycle Sheriff can't report.
- **No encapsulation yet.** Nothing moves into `internal/`; every file stays public to the modules allowed to import it.
- **Config.** This is the agreed config. It replaces the research doc (`docs/research/sheriff-module-boundaries.md` on branch `research/sheriff-module-boundaries`), which is deleted after this spec is done, so it's kept here verbatim. The research checked it against today's 75 cross-module imports with a replica of Sheriff's algorithm and found 0 violations; Sheriff itself hasn't run on this repo yet.

  ```ts
  import { noDependencies, SheriffConfig } from '@softarc/sheriff-core';

  const isSpec = (filePath: string) => filePath.endsWith('.spec.ts');
  const isAppRoutes = (filePath: string) => /[\\/]src[\\/]app[\\/]app\.routes\.ts$/.test(filePath);

  export const config: SheriffConfig = {
    entryFile: 'src/main.ts',
    enableBarrelLess: true,
    // An index.ts anywhere would otherwise silently become an untagged module.
    autoTagging: false,
    modules: {
      // A new Baseline folder needs an entry here and in the `feature` rule below.
      'src/environments': 'env',
      'src/app/firebase': 'baseline:firebase',
      'src/app/browser': 'baseline:browser',
      'src/app/auth': 'baseline:auth',
      'src/app/live-data': 'baseline:live-data',
      'src/app/profile': 'baseline:profile',
      'src/app/pwa': 'baseline:pwa',
      'src/app/home': 'baseline:home',
      'src/app/testing': 'testing',
      'src/app/features': 'feature-route-list',
      'src/app/features/<feature>': 'feature',
    },
    depRules: {
      root: [
        'env',
        'baseline:*',
        ({ to, fromFilePath }) => to === 'feature-route-list' && isAppRoutes(fromFilePath),
      ],
      env: 'baseline:firebase',
      'baseline:firebase': noDependencies,
      'baseline:browser': noDependencies,
      'baseline:auth': ['baseline:firebase', 'baseline:browser'],
      'baseline:live-data': ['baseline:auth', 'baseline:firebase'],
      'baseline:profile': ['baseline:live-data', 'baseline:firebase'],
      'baseline:pwa': 'baseline:browser',
      'baseline:home': ['baseline:auth', 'feature-route-list'],
      'feature-route-list': 'feature',
      // Not home: it imports the Feature route list, so Feature → home would close a cycle.
      feature: [
        'baseline:firebase',
        'baseline:browser',
        'baseline:auth',
        'baseline:live-data',
        'baseline:profile',
        'baseline:pwa',
      ],
      testing: ['root', 'env', 'baseline:*'],
      '*': ({ to, fromFilePath }) =>
        isSpec(fromFilePath) && (to === 'testing' || to === 'env' || to.startsWith('baseline:')),
    },
  };
  ```

- **Sheriff behaviour the config relies on:**
  - Files outside every listed folder (the app shell: `main.ts`, `app.ts`, `app.config.ts`, `app.routes.ts`, test setup) form the implicit `root` module.
  - A file belongs to the module with the longest matching path, so the route list file is in `feature-route-list` and each Feature's files in their own `feature` module. Both keys must stay flat, not nested.
  - Every tag of the importing module must be allowed to reach at least one tag of the imported module. Imports within one module are never checked.
  - Rule functions see the real importing file (`fromFilePath`) but only the imported *module* path, so a rule can single out `app.routes.ts` as importer but can't restrict which file of a module is imported.
  - Type-only imports, re-exports and dynamic `import()` all count. Third-party imports are ignored. The `firebase.json` import from the environments is ignored by default (non-code extension).
  - The config file is transpiled and evaluated without type-checking; type errors show only in the editor.
- **Gotchas to keep in mind:**
  - Feature folder names: placeholder discovery matches only letters, `-` and `_`. A folder such as `todo2` would not become a module; its files would fall into `feature-route-list`, unchecked against home and the app routes.
  - Module assignment is prefix-based: a sibling folder such as `features-old` would count as part of the Feature route list's module.
  - The `'*'` rule matches every tag, so it hides Sheriff's "no rule for this tag" error for a forgotten `depRules` entry. That tag then gets only the spec allowance, so its production imports still fail, with a less direct message.
  - A new Baseline folder without a `modules` entry falls into `root`: root may import it, no Baseline module may, so lint fails as soon as one tries.
  - Any future tsconfig path aliases must go in the root `tsconfig.json`; Sheriff doesn't follow project references.
- **`docs/features.md`:**
  - "The features folder": `npm run lint` enforces its import rules.
  - "Keep Firestore behind the lazy route": the lazy-`import()` rule and Firestore value imports are still checked only by review and the bundle budget; lint treats static and dynamic imports alike and ignores third-party imports.
  - "Adding a Feature": the folder name is lowercase letters and hyphens only.
- **ADR 0005, "Sheriff enforces the Baseline/Feature import rules at lint time".** Records: barrel-less over barrel modules, one tag per folder over a scope × layer matrix, specs exempted through one `'*'` rule, the test helpers as Baseline with their own tag. Consequences: no cycle detection, no third-party import checks (Firestore stays with ADR 0003's bundle budget), static and dynamic imports count the same, no shared area for code used by several Features, and a new Baseline folder means editing the config. No alternatives section (the tool was chosen up front) and no link to the research doc.
- **CI.** `npm run lint` only. `sheriff verify` walks only files reachable from `main.ts`, a subset of what ESLint checks; `npx sheriff list` and `export` stay available locally.

## Testing Decisions

- **One seam: `npm run lint`.** It runs ESLint over every `.ts` file in `src/`, specs and test helpers included, and CI already runs it. A good check here asserts what the repo's import rules allow and forbid, not how Sheriff computes it, so no rule-level fixture (ESLint `RuleTester`) or lint-output snapshot is committed: those would pin Sheriff's internals.
- **Today's code passes:** `npm run lint` is green with Sheriff enabled.
- **The rules bite (verification, not committed):** add one throwaway import at a time, confirm `npm run lint` fails with Sheriff's dependency-rule message naming both modules, then revert:
  1. a Baseline file importing a Feature (e.g. auth → notes);
  2. a Feature importing another Feature (needs a second throwaway Feature folder);
  3. production code importing the test helpers;
  4. a Baseline spec importing a Feature's fake.
  Record the four outputs in the PR.
- **Modules are found (verification):** `npx sheriff list src/main.ts` shows each Baseline folder, `env`, `feature-route-list` and notes as a `feature` module. Paste it into the PR.
- **Nothing else moves:** no production or test code changes, so `npm test`, `npm run test:integration` and `npm run build` stay green as they are.
- **Lint time:** run `npm run lint` before and after on the same machine and record both in the PR. No threshold, unless it more than doubles; then raise it before merging.
- **Prior art:** the removal dry run in the features spec, a verification recorded in the PR rather than committed.

## Out of Scope

- **Encapsulation.** Moving module-private files into `internal/` (candidates: the credentials form, auth failure model and return URL in auth; everything in the notes Feature except its routes). It changes the shape `docs/features.md` tells new Features to copy. Its own ticket, starting as needs-triage.
- Checking third-party imports, e.g. Firestore value imports in eager code with `no-restricted-imports`.
- Cycle detection.
- A shared area for code used by several Features.
- Per-Feature tags (`feature:<name>`), only useful once a Feature spans several Sheriff modules.
- Adding `sheriff verify` to CI.
- Moving the Baseline folders into a folder of their own, or any other file move.
- Removing the environments → Firebase wiring type import or the test helpers' import of the app shell. Both are allowed and visible in the config.

## Further Notes

- Tickets, one branch and PR each (`AGENTS.md`):
  1. `01-dependency-rules` (ready-for-agent): packages, Sheriff config, ESLint block, ADR 0005, the `docs/features.md` lines, and the verification above. Implementation ends by deleting the research doc and the `research/sheriff-module-boundaries` branch.
  2. `02-encapsulation` (needs-triage): see Out of Scope.
- The decisions come from the research doc's §11 and a grilling session. Grilling: Q1 the Feature route list belongs to neither side; Q2 tag renamed from `feature-registry` to `feature-route-list`; Q3 test helpers are Baseline; Q4 two tickets; Q5/Q13/Q14 research doc never merged, spec self-contained; Q6 negative checks in the PR; Q7 exact pin; Q8/Q15 ADR without alternatives; Q9 folder names; Q10 documented limits; Q11 no shared area; Q12 lint time; Q16 config warning for Baseline folders; Q17 slug `sheriff`.
- The Angular Architects blog on Sheriff (2023) uses an outdated config shape (`tagging`, rules under `modules`, `.eslintrc`); take only its strategic-design rationale from it.

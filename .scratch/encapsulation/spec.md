# Spec: Module-private files live in `internal/`

Status: ready-for-agent

## Problem Statement

Sheriff (ADR 0005) checks which module may import which, but not which files inside a module may be imported. Every file stays public to the modules allowed to import it. So a Baseline module can reach into a helper that another Baseline module only uses for itself, e.g. home importing auth's return URL handling or the credentials form, and the Feature route list could load a Feature's page directly instead of through the Feature's routes. Lint passes, and the module's real interface is whatever someone happens to import.

That matters most for Features. `docs/features.md` says a Feature is reached only through its route entry, but nothing in the Feature's folder shows which file is its entry and which files are its insides. A developer copying the notes Feature has to guess, and in a project created from the Template, where Features are the product, those guesses turn into accidental public APIs.

Sheriff's `encapsulation` rule is already on (the ESLint block extends `sheriff.configs.all`), but it hides nothing because no module has a folder that matches its default pattern.

## Solution

Use Sheriff's default encapsulation for barrel-less modules: any file inside a module's `internal/` folder can be imported only from within that module. Move every module-private file into an `internal/` folder in its module. `npm run lint`, which CI already runs, then fails on any import of another module's `internal/` file.

Today that touches two modules:

- **auth:** the credentials form (component and template), the auth failure model and the return URL helpers move into auth's `internal/`. Sign-in and sign-up stay where they are: they sit in auth's subfolders, are part of the auth module and keep importing these files.
- **The notes Feature:** everything except its routes file moves into the Feature's `internal/`: the notes page, the note form, the note model, the notes data-access service, their templates and specs, and the fake (`internal/testing/`). The routes file is the only public file.

No Sheriff config change: the default pattern, `internal`, already applies. Developers following the rules notice only the new folders. A new Feature copied from notes gets the shape for free, and `docs/features.md` says why.

The choice of `internal/` over Sheriff's regex alternative (underscore-prefixed files, possible since Sheriff 0.18.1) is recorded in ADR 0006.

## User Stories

1. As a developer, I want lint to fail when a module imports a file in another module's `internal/` folder, so that each module's insides stay private.
2. As a developer, I want lint to fail when the Feature route list imports anything in a Feature except its routes file, so that every Feature is reached only through its routes.
3. As a developer, I want lint to fail when a Baseline module imports auth's credentials form, failure model or return URL helpers, so that auth can change them without breaking other modules.
4. As a developer, I want lint to fail when the test helpers import a module's `internal/` file, so that shared fakes and `renderApp` depend only on a module's public files, even though the dependency rules allow the test helpers to import every Baseline module.
5. As a developer, I want lint to fail when a spec in another module imports a module's `internal/` file, so that the spec exemption in ADR 0005 loosens the dependency rules only, not encapsulation.
6. As a developer, I want files in a module's subfolders (e.g. sign-in and sign-up in auth) to keep importing that module's `internal/` files, so that a module can be split into subfolders without exposing its helpers.
7. As a developer, I want a module's own specs, wherever they sit in the module, to import its `internal/` files, so that private code stays testable.
8. As a developer, I want a module's public files to keep importing its `internal/` files, so that the public entry point can delegate to private code.
9. As a developer, I want the notes Feature's routes file to stay at the top of its folder and be the Feature's only public file, so that a Feature's entry point is obvious at a glance.
10. As a developer copying the notes Feature, I want the copied folder to already have the public-routes-plus-`internal/` shape, so that a new Feature is encapsulated without extra work.
11. As a developer adding a Feature, I want `docs/features.md` to say that only `<name>.routes.ts` stays outside `internal/` and why, so that I don't move files out by mistake.
12. As a developer, I want a Feature's fake to live in `internal/testing/`, so that only that Feature's specs can use it, by encapsulation as well as by the dependency rules.
13. As a developer adding a file to any module, I want a written rule for where it goes (into `internal/` unless another module imports it), so that new files don't widen a module's interface by default.
14. As a developer who needs a private file from another module, I want moving it out of `internal/` to be an explicit change in a diff, so that widening a module's interface is a reviewed decision.
15. As a developer, I want the Sheriff config left unchanged, so that encapsulation relies on Sheriff's documented default and no new setting needs explaining.
16. As a developer reading a lint failure, I want Sheriff's encapsulation message to name the file that was imported, so that I know which file is private and to whom.
17. As a developer, I want auth's public files (session, session error, guards, credentials model, session user model, sign-in, sign-up) to stay where they are, so that the app routes, home, Live data and the test helpers keep their imports.
18. As a developer, I want the Baseline modules that have no private files to get no `internal/` folder, so that no empty folders appear.
19. As a developer, I want templates to move with their components, so that `templateUrl` stays a sibling path.
20. As a developer, I want specs to move with the files they test, so that a test still sits next to the code it covers.
21. As a developer, I want the lazy route to the notes Feature unchanged, so that the Firestore SDK stays out of the initial bundle (ADR 0003).
22. As a future reader, I want ADR 0006 to explain why `internal/` folders were chosen over Sheriff's underscore regex, so that I don't switch without knowing the trade-offs.
23. As a future reader, I want ADR 0006 to list what encapsulation doesn't catch, so that the gaps are known.
24. As a future reader, I want ADR 0005 to stop saying every file stays public, so that the two ADRs don't contradict each other.
25. As an agent writing code, I want `AGENTS.md` to state the `internal/` rule, so that new files land in the right place without reading the ADR first.
26. As a developer, I want the docs that point at files in the notes Feature to point at their new paths, so that examples aren't broken links.
27. As a maintainer, I want `npm test`, `npm run test:integration` and `npm run build` to stay green, so that I know the move changed no behaviour.
28. As a developer removing a Feature, I want "delete its folder" to still remove it fully, so that the removal steps don't change.

## Implementation Decisions

- **Mechanism:** Sheriff's encapsulation for barrel-less modules with its default pattern, the `internal` folder at a module's top level. A file under that folder, at any depth, can be imported only by files of the same module. The `encapsulation` rule is already active through `sheriff.configs.all`; the Sheriff config stays as it is, with no `encapsulationPattern` set.
- **Rule for every module:** a file goes into `internal/` when no other module imports it. It stays outside (public) when another module imports it, specs and test helpers included. Applying this rule to today's imports gives exactly the two modules above.
- **auth's private files:** the credentials form and its template, the auth failure model, the return URL helpers. The auth session error stays public although it uses the failure model, because home and the test helpers import it. Sheriff checks import paths only, so a public file can expose a private type without anyone importing it.
- **notes Feature's private files:** everything but the routes file: the notes page and note form (with templates), the note model, the notes data-access service, all specs and integration specs, and the fake, which moves from `testing/` to `internal/testing/`. The routes file's import of the notes page points into `internal/`.
- **Every other Baseline module** (Firebase wiring, browser, Live data, profile, PWA, home), the test helpers and the environments: unchanged. Each of their files is imported by another module today.
- **Moves, not rewrites:** files keep their names and contents. Only relative import paths change. Spec files move with the file they test.
- **`internal/` is not a module:** it's a folder inside one, so `sheriff list` shows the same modules as before, and the Feature placeholder still matches one folder per Feature.
- **ADR 0006, "Module-private files live in an `internal/` folder":**
  - Records the rule and that it relies on Sheriff's default.
  - Records the alternative it rejects: `encapsulationPattern: /(^|\/)_/` (underscore-prefixed files or folders, supported since Sheriff 0.18.1). It keeps folders flat, but the underscore prefix is unusual in Angular file names, `ng generate` doesn't produce it, it adds a config setting to explain, and it's unverified whether it handles Windows path separators.
  - Consequences:
    - Files are public by default. Nothing flags a file outside `internal/` that only its own module uses.
    - Encapsulation is per file path, not per type: a public file may expose a private type.
    - Import paths get one folder deeper.
    - Specs in another module get no exemption.
    - Like the dependency rules, encapsulation treats static and dynamic imports the same.
- **ADR 0005:** the barrel-less paragraph's "every file stays public to the modules allowed to import it" now says that a module's public files are those outside its `internal/` folder (ADR 0006). This edits an accepted ADR, because the sentence states a current fact that this change makes false; ADR 0005's decision itself stands.
- **`docs/features.md`:**
  - "What a Feature owns": the folder row says the routes file is public and everything else is in `internal/`, the fake in `internal/testing/`.
  - "Adding a Feature": the shape bullets say `<name>.routes.ts` stays at the top of the folder and everything else goes in `internal/`, enforced by `npm run lint`. The fake bullet names `internal/testing/`.
  - "Keep Firestore behind the lazy route" still holds; its rule that only the Feature route list reaches into a Feature's folder now has lint behind it for every file except the routes file.
- **`docs/agents/testing.md`:** the example path of the notes data-access service's integration spec points into `internal/`.
- **`AGENTS.md`:** one short rule under Code style: a new file goes into its module's `internal/` folder unless another module imports it. Moving one out is a deliberate interface change. Points to ADR 0006.
- **`README.md` and `CONTEXT.md`:** no change. README names only the Feature folder, and `internal/` isn't a domain term.

## Testing Decisions

- **One seam: `npm run lint`**, the same seam as the Sheriff spec. It runs ESLint with Sheriff's `encapsulation` rule over every `.ts` file in `src/`, specs and test helpers included, and CI already runs it. A good check asserts what may and may not be imported, not how Sheriff computes it, so no rule-level fixture or lint-output snapshot is committed.
- **Today's code passes after the move:** `npm run lint` is green.
- **Encapsulation bites (verification, not committed):** add one throwaway import at a time, confirm `npm run lint` fails with Sheriff's encapsulation message, then revert:
  1. home importing auth's return URL helpers (a Baseline module the dependency rules allow to import auth);
  2. the Feature route list importing the notes page directly instead of the notes routes;
  3. the test helpers importing auth's credentials form;
  4. a spec in another Baseline module that may import auth (e.g. Live data) importing auth's failure model.
  Record the four outputs in the PR.
- **Same-module access still passes (covered by the green run):** sign-in and sign-up import auth's credentials form and return URL helpers from a subfolder; auth's guards import the return URL helpers; the notes routes import the notes page; notes specs import the fake.
- **Modules unchanged (verification):** `npx sheriff list src/main.ts` shows the same modules as before the move, with no `internal` module. Paste it into the PR.
- **Behaviour unchanged:** `npm test`, `npm run test:integration` and `npm run build` stay green, and the build's initial bundle stays under the 500 kB budget with the notes Feature still lazy.
- **Prior art:** the Sheriff spec's negative checks (`.scratch/sheriff/spec.md`, Testing Decisions), which were recorded in PR #43 rather than committed.

## Out of Scope

- Sheriff's regex pattern (underscore-prefixed private files). Rejected in ADR 0006.
- Moving public files to make more of a module private, e.g. having the test helpers stop importing auth's credentials model or session user model.
- Splitting modules, or giving a Baseline folder its own public "API" file.
- Barrel files (`index.ts`). ADR 0005 keeps modules barrel-less.
- A lint check that flags a public file only its own module imports.
- Encapsulation for the test helpers and the environments, whose files are all imported by other modules.
- Cycle detection, third-party import checks and a shared area for Features (still out of scope from the Sheriff spec).

## Further Notes

- Replaces ticket `02-encapsulation` in `.scratch/sheriff/issues/`, which was left at needs-triage by the Sheriff spec. The choice between `internal/` folders and the underscore regex came from the research note `.scratch/sheriff/research-project-setup-and-detective.md`, which checked `encapsulationPattern` against Sheriff 0.20.0's source.
- One ticket, one branch and PR (`AGENTS.md`): `01-internal-folders`. It covers the moves, ADR 0006, the ADR 0005 sentence, the doc updates and the verification above.

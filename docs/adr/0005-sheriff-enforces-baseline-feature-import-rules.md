# Sheriff enforces the Baseline/Feature import rules at lint time

Sheriff (`@softarc/sheriff-core` with its ESLint plugin) checks every import in `src/` against the rules in `sheriff.config.ts`, so `npm run lint` fails when the Baseline imports a Feature, a Feature imports another, anything but the app routes and home imports the Feature route list, production code imports the test helpers, or a Baseline folder imports one that `sheriff.config.ts` doesn't allow it. Each Baseline folder, the environments, the test helpers, the Feature route list and each Feature folder is a Sheriff module with one tag.

The modules are barrel-less: there is no `index.ts`, and a module's public files, those outside its `internal/` folder (ADR 0006), are open to the modules allowed to import it. A barrel could pull Firestore into eager code (ADR 0003), and the test helpers import the app shell, which a barrel rule would block unless every check on the app shell were switched off. Automatic tagging is off, so a stray `index.ts` fails instead of becoming an untagged module.

Each folder gets one tag (`baseline:<folder>`, `env`, `testing`, `feature-route-list`, `feature`) instead of a scope × layer matrix: the Baseline is flat folders with no layers inside, so a matrix would need invented layer names. Switching later moves no files.

Specs are exempted through one `'*'` rule: a `*.spec.ts` file may also import the test helpers, the environments and any Baseline module. A Feature's fake stays inside the Feature, so only its own specs use it, and a Baseline spec that imports it fails.

The test helpers count as Baseline but get their own tag, so that production code can't import them and they can't import a Feature or the Feature route list.

## Consequences

- Sheriff detects no cycles. Features may use every Baseline module except home, because home imports the Feature route list and Feature → home would close a cycle nothing reports.
- Third-party imports aren't checked: a value import from `firebase/firestore` in eager code is still caught only by ADR 0003's bundle budget.
- Static and dynamic `import()` count the same, so lint can't tell whether a Feature is reached only through `loadChildren`.
- Features have no shared area yet: no Feature may import code from another, even code meant for several Features.
- A new Baseline folder needs an entry in the config's `modules` and in the `feature` rule. Without it, the folder falls into the app shell's module and lint fails as soon as a Baseline module imports it.
- A new Feature folder is picked up automatically, but only if its name is lowercase letters and hyphens.

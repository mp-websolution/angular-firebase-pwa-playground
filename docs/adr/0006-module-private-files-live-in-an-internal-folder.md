# Module-private files live in an `internal/` folder

A file that no other module imports goes into an `internal/` folder at the top of its module, e.g. `src/app/auth/internal/` or `src/app/features/notes/internal/`. Sheriff's encapsulation for barrel-less modules lets only files of the same module import a file under that folder, at any depth, so `npm run lint` fails when another module, its specs or the test helpers import it. A file stays outside `internal/`, public to the modules ADR 0005 allows, when another module imports it, specs and test helpers included. A Feature's only public file is its `<name>.routes.ts`.

This relies on Sheriff's default `encapsulationPattern`, `internal`, so `sheriff.config.ts` doesn't set it. `internal/` is a folder inside a module, not a module of its own.

We rejected Sheriff's regex alternative, `encapsulationPattern: /(^|\/)_/`, which makes underscore-prefixed files or folders private (since Sheriff 0.18.1). It keeps folders flat, but the underscore prefix is unusual in Angular file names, `ng generate` doesn't produce it, it adds a config setting to explain, and it's unverified whether it handles Windows path separators.

## Consequences

- Files are public by default. Nothing flags a file outside `internal/` that only its own module imports, and moving a file out of `internal/` widens its module's interface in a diff.
- Encapsulation is per file path, not per type: a public file may expose a private type, e.g. `AuthSessionError.reason` is an `AuthFailure` from auth's `internal/`.
- Import paths get one folder deeper.
- Specs in another module get no exemption: ADR 0005's spec rule loosens the dependency rules only.
- Like the dependency rules, encapsulation treats static and dynamic imports the same, so lint still can't tell whether a Feature's routes are reached only through `loadChildren`.

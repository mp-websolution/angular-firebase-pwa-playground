# Module-private files live in an `internal/` folder

We want each Sheriff module's interface to be a deliberate, reviewed choice, not whatever other modules happen to import. So a file that no other module imports goes into an `internal/` folder at the top of its module, e.g. `src/app/auth/internal/` or `src/app/features/notes/internal/`. Sheriff's encapsulation for barrel-less modules lets only files of the same module import a file under that folder, at any depth. `npm run lint` fails when a file of another module imports it, be it production code, a spec or a test helper.

A file stays outside `internal/` when another module imports it, even if only a spec or a test helper does. ADR 0005's rules then decide which modules may import it. A Feature's only public file is its `<name>.routes.ts`.

This relies on Sheriff's default `encapsulationPattern`, `internal`, so `sheriff.config.ts` doesn't set it. `internal/` is a folder inside a module, not a module of its own.

We rejected Sheriff's regex alternative, `encapsulationPattern: /(^|\/)_/`, which makes underscore-prefixed files or folders private (since Sheriff 0.18.1). It keeps folders flat, but the underscore prefix is unusual in Angular file names, `ng generate` doesn't produce it, it adds a config setting to explain, and it's unverified whether it handles Windows path separators.

## Consequences

- Files are public by default. Nothing flags a file outside `internal/` that only its own module imports, and moving a file out of `internal/` widens its module's interface in a diff.
- Encapsulation is per file path, not per type: a public file may expose a private type, e.g. `AuthSessionError.reason` is an `AuthFailure` from auth's `internal/`.
- Import paths get one folder deeper.
- Specs in another module get no exemption: ADR 0005's spec rule loosens the dependency rules only.
- Encapsulation has the same blind spot for dynamic imports as the dependency rules (ADR 0005).

# Context map

This repo has two contexts, each with its own glossary and ADR folder. Read both glossaries before naming a domain concept.

## Contexts

- [Baseline](CONTEXT.md): the Playground, the Template, the Baseline, Features, Projects and Baseline releases. Its decisions are in [`docs/adr/`](docs/adr/). Only the Template changes them.
- [Project](docs/project/CONTEXT.md): the domain of the Project's own Features. Its decisions are in [`docs/project/adr/`](docs/project/adr/), numbered on their own. Project-owned: empty in the Template.

## Relationships

- **Baseline → Project**: the Project uses the Baseline's terms as defined and never redefines them. The Project's terms describe its Features, which sit beside the Baseline.
- A Baseline release may add Baseline terms or ADRs; it never changes the Project's.

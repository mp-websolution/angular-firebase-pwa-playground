# Spec: Features beside the Baseline

**Status:** resolved

## Problem Statement

The Playground separates the Baseline from the self-contained pieces beside it only by convention. The notes Prototype sits in its own folder at the top of the app, next to Baseline folders such as auth and profile, so nothing about its location says it isn't Baseline. A dependency rule such as "the Baseline never depends on a Prototype" or "no Prototype depends on another" can't tell the two apart without listing every Prototype by name, and a new one would count as Baseline until someone remembered to update the list. That blocks the strictly enforced module seams and dependency rules we want to add next.

The name doesn't fit either. "Prototype" says disposable, but in a project created from the Template these pieces are the product, not throwaway experiments. Meanwhile "feature" is already used loosely in the docs: in the issue tracker's `<feature-slug>` directories (where `baseline` is one of the slugs) and in "Feature data-access services", which includes Baseline code such as the profile and the auth session. So the word we want is taken by a vaguer meaning.

## Solution

Rename the term Prototype to **Feature** across the code, config and live docs, and give Features one fixed place: a features folder inside the app that holds every Feature and the Feature route list. Everything in the app outside that folder is Baseline. Make "Feature" a reserved term: reword the loose uses so it only ever means a self-contained piece beside the Baseline.

Users see one change: the home page's navigation to Features is labelled "Features" instead of "Prototypes". URLs stay the same, e.g. the notes page stays at `/notes`.

The glossary change in `CONTEXT.md` was made during the grilling session and is part of this work (it has to land with it).

## User Stories

1. As a signed-in user, I want home to link to every Feature by its title, so that I can reach each one.
2. As a signed-in user, I want the links grouped in a navigation called "Features", so that a screen reader names the group by what it holds.
3. As a signed-in user, I want the notes page to stay at `/notes`, so that my bookmarks and the installed PWA keep working.
4. As a signed-in user, I want my existing notes to stay where they are, so that the rename doesn't lose my data.
5. As a developer, I want every Feature in one features folder, so that I can tell Feature from Baseline by location alone.
6. As a developer, I want everything in the app outside the features folder to be Baseline, so that there is no third category to classify.
7. As a developer, I want the Feature route list inside the features folder, so that the place where Baseline meets the Features belongs to the Features.
8. As a developer, I want the route list's names to say Feature (`featureRoutes`, `FeatureRoute`), so that code and glossary use the same word.
9. As a developer, I want the notes Feature to keep its shape (routes, pages, data-access service, model, fake, tests), so that it still works as the reference to copy.
10. As a developer, I want a Feature's fake to stay inside that Feature, so that deleting the Feature deletes its fake.
11. As a developer, I want `renderApp` to keep having no default for a Feature's data-access service, so that Baseline tests never depend on a Feature.
12. As a developer, I want the Firestore rules section markers to say `Feature: notes`, so that the rules file uses the glossary term.
13. As a developer, I want the rules section's marker to name the Feature's new folder, so that I can find the code it guards.
14. As a developer, I want the notes seed script named after the Feature (`feature-notes`), so that seed files follow the same term.
15. As a developer, I want the seeded welcome note to call notes a Feature, so that demo data doesn't use the old term.
16. As a developer, I want the guide for adding and removing Features renamed to say Features, so that I find it under the term I know.
17. As a developer, I want that guide to state the folder rule: every Feature lives in the features folder, everything else in the app is Baseline, and nothing outside the features folder imports from it except the app routes and home importing the Feature route list, so that the coming lint rule has an agreed wording to enforce.
18. As a developer, I want the README's Playground overview and Features section to use Feature, so that the first page I read matches the glossary.
19. As a developer, I want the README and glossary to describe the Playground's purpose as trying out updates and ideas, not prototyping, so that "prototype" doesn't creep back as a near-synonym.
20. As a developer, I want the testing guide to describe a Feature's fake and its missing `renderApp` default in Feature terms, so that test instructions match the code.
21. As a developer, I want `AGENTS.md`'s comment rules to name the Feature begin/end markers in rules files, so that agents keep the right comments.
22. As a developer, I want "Feature data-access services" in `AGENTS.md` reworded to "Data-access services", so that profile and auth aren't called Features.
23. As a developer, I want the issue tracker's directories described as `.scratch/<spec-slug>/`, so that "feature" isn't used for a unit of planned work.
24. As a developer, I want `renderApp`'s TSDoc to say Feature, so that the generic test helper uses the glossary term.
25. As a developer, I want the closed specs and tickets under `.scratch/` left as written, so that the record of past work stays accurate.
26. As a developer, I want the vendored skills under `.agents/` left unedited, so that skill updates still apply cleanly.
27. As a developer, I want the wayfinder skill's `prototype` ticket type left in the issue-tracker guide, so that the skill keeps working; it's the skill's vocabulary, not our term.
28. As a developer adding a Feature, I want the "Adding a Feature" steps to point into the features folder, so that a new Feature can't land among the Baseline folders.
29. As a developer removing a Feature, I want the "Removing a Feature" steps to name the features folder, its route list entry, its rules section and its seed script, so that removal stays a four-part deletion.
30. As a developer, I want deleting the notes Feature to leave lint, unit tests, integration tests and build green, apart from home's Features navigation test, which names each Feature, so that the Baseline provably doesn't depend on any Feature.
31. As a developer, I want the initial bundle to stay under the 500 kB budget after the move, so that Firestore still loads only behind lazy routes (ADR 0003).
32. As an agent, I want no live doc, code or config file outside the exceptions above to mention "prototype", so that a search for the old term turns up nothing to act on.

## Implementation Decisions

- **Term.** Prototype is renamed to Feature, and its meaning changes: a Feature is a self-contained piece of the app beside the Baseline. It may depend on the Baseline, never on another Feature, and deleting it leaves the Baseline intact. Unlike a Prototype, a Feature isn't defined as disposable. Authentication and the user profile are Baseline, never Features. `CONTEXT.md` already carries this definition.
- **Reserved word.** "Feature" means only the glossary term. The loose uses get reworded: the issue tracker's `<feature-slug>` becomes `<spec-slug>` (in `AGENTS.md`, `docs/agents/issue-tracker.md` and the README's file table), and "Feature data-access services" becomes "Data-access services". Existing `.scratch/` directory names don't change.
- **Verb.** "Prototyping" in the Playground's purpose becomes "trying out" (glossary and README). No live doc uses "prototype" as a noun or verb, except the wayfinder skill's `prototype` ticket type.
- **Layout.** A features folder directly inside the app holds one folder per Feature plus the Feature route list. The notes Feature moves there unchanged inside. All other app folders and the shell files stay where they are, as Baseline. This builds on `main` after PR #40, which already moved Live data into its own Baseline module.
- **Route list module.** The Feature route list keeps its role and shape (each Feature is a lazy `loadChildren` entry with a `title`) under Feature names: `featureRoutes` and `FeatureRoute`. Its two importers are the app routes, which spread it into the route config, and home, which renders the links. Only the list itself reaches into a Feature folder, and only through `import()`.
- **Home.** The navigation's accessible name becomes "Features", and the template's loop variable and field are renamed to match. Link text stays each Feature's title, and link targets stay each Feature's path.
- **URLs.** Paths don't change. The features folder is code layout only.
- **Rules and seed.** The Firestore rules section markers become `Feature: notes`, with the folder reference updated and the "delete with" line saying Feature. The seed script is renamed to `feature-notes`; the seed runner picks up every seeder in name order, so it still runs after the numbered demo-user and demo-profile seeders.
- **Docs.**
  - The Prototype guide becomes a Feature guide (`docs/features.md`), with every step pointing into the features folder.
  - The guide states the folder rule from story 17, as the wording a later lint rule will enforce.
  - Also updated: the README (overview, Features section, file table), `docs/agents/testing.md`, the comment rules in `AGENTS.md`, and the TSDoc of the route list and of `renderApp`.
- **Untouched:** closed `.scratch/` specs and tickets, `.agents/` vendored skills, ADRs (none mention Prototype), git history.
- **No ADR.** The layout is cheap to reverse and the reasons are recorded in the glossary and the Feature guide.

## Testing Decisions

- A good test drives the app as a user does, through `renderApp`, querying by role, label and text (ADR 0004). It asserts what the user sees, not which file a route lives in. This change has no behaviour of its own beyond the renamed navigation, so existing tests carry most of the proof.
- **New test, Home:** a signed-in user sees a navigation named "Features" with a link per Feature, by its title, pointing at its unchanged path (Notes → `/notes`). Nothing pins these links today. Prior art: the existing Home tests and the notes page tests, which render through `renderApp` with a `FakeAuthSession`.
- **Moved tests, unchanged:** the notes component tests, the notes data-access integration tests and the notes rules tests move with the folder. Only their import paths change; they prove the move broke nothing.
- **Removal dry run (verification, not committed):** delete the notes Feature folder, its route list entry, its rules section and its seed script, then run lint, unit tests, integration tests and build; all must pass except the new Home test, which lists Notes. Restore afterwards. This is the same dry run the notes example ticket recorded and proves the Baseline doesn't depend on any Feature.
- **Bundle budget:** `npm run build` stays under the 500 kB initial-bundle warning, the existing check that Firestore stays behind lazy routes.
- **Old-term search (verification):** a case-insensitive search for "prototyp" over tracked files finds matches only in `.scratch/`, `.agents/`, the wayfinder ticket type in the issue-tracker guide, and `CONTEXT.md`'s _Avoid_ line.

## Out of Scope

- Enforcing module seams and dependency rules with lint (Baseline never imports a Feature, no Feature imports another, entry points per module, ADR 0003's lazy zone as a rule). That comes next, in its own spec.
- Whether home should build its Feature links from the Router instead of importing the route list (architecture review candidate 3). Until that's decided, home stays a permitted importer.
- Route-shaped interfaces for auth and profile (candidate 4) and splitting the test kit (candidate 6).
- Moving Baseline folders into a baseline folder of their own.
- Renaming or rewriting closed `.scratch/` specs and tickets, vendored skills, or git history.
- Changing URLs, Firestore paths or stored data.

## Further Notes

- The architecture review (candidate 2, "one path for every Prototype") proposed this layout under the old name; this spec supersedes its naming.
- The decisions come from a grilling session: Q1 meaning change, Q2 reserved word, Q3 features-only nesting, Q4 renames, Q5 history untouched, Q6 verb, Q7 URLs, Q8 fakes, Q9 one PR then lint, Q10 folder rule in the guide, Q11 home as second importer.
- Branch per `AGENTS.md`: `features/01-…` only once tickets exist; as a single spec-level change, a branch off an updated `main` such as `refactor/features` fits the agreed one-PR delivery.

## Comments

- **Implemented** on `refactor/features`. Lint, unit (91), integration (88), build (468.68 kB initial) and format pass. The removal dry run passes too: lint, unit 64, integration 70 and build 467 kB, with nothing committed.
- **Link test in Home.** "New test, Home" lives in `src/app/home/home.spec.ts` ("links to every Feature by its title in the Features navigation"). It names Notes, so it's the one test the removal dry run (story 30) is allowed to fail. `docs/features.md` says to add and drop a Feature's link there.
- **Old-term search** also matches `package-lock.json` (npm package `setprototypeof`), which can't change.

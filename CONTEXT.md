# Baseline glossary

The domain terms of the Baseline context: a template repository for Angular PWAs backed by Firebase, used for trying out Angular and Firebase updates and ideas, and the source of every Project built on its Baseline. A Project's own terms are in `docs/project/CONTEXT.md` (both are listed in `CONTEXT-MAP.md`).

## Language

**Playground**:
This repository as a working space: the Baseline plus any Features, where updates and ideas are tried out.
_Avoid_: Starter, boilerplate, sandbox

**Template**:
This repository in its role as the source of every Project. Changes flow one way, from the Template to Projects through Baseline releases, and never back automatically.
_Avoid_: Fork, seed

**Baseline**:
The permanent, minimal shell every Project inherits: authentication, the user profile, Firebase wiring, Live data, PWA behaviour, and the build and deploy pipeline. It stays small and never depends on any Feature; it reaches Features only through the Feature route list.
_Avoid_: Core, skeleton, scaffold

**Feature**:
A self-contained piece of the app that sits beside the Baseline. It may depend on the Baseline but never on another Feature, and deleting it leaves the Baseline intact. In the Playground a Feature is usually thrown away once tried; in a Project it is the product. Authentication and the user profile are Baseline, never Features.
_Avoid_: Prototype, experiment, demo, module

**Feature route list**:
The one list of every Feature's entry point, where the Baseline meets the Features. It belongs to neither: the Baseline may read it, and only it reaches into a Feature. Adding or removing a Feature means adding or removing its entry.
_Avoid_: Feature registry, feature index

**Live data**:
The signed-in user's Firestore data, kept up to date on this device, with whether changes are waiting to sync and whether loading failed.
_Avoid_: Realtime data, synced data, store

**Project**:
A repository created from the Template, with its history, that keeps merging Baseline releases. Its Features are the product. Capitalised to tell it apart from a Firebase project or the Angular project.
_Avoid_: Fork, downstream repo, derived app

**Baseline release**:
A numbered version of the Baseline, tagged `baseline-vX.Y.Z` on the Template's main branch, that Projects merge. Its major number goes up whenever a Project must act by hand.
_Avoid_: Template release, Baseline version, upstream update

**Project-owned file**:
A file the Template ships a starting version of and the Project then owns, such as the app identity or the README. The Template changes it only with an upgrade note.
_Avoid_: Project file, override, customisation

**Baseline drift**:
A Baseline file that differs in a Project from the Baseline release it last merged.
_Avoid_: Divergence, local patch

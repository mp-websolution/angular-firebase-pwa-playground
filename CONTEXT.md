# Angular Firebase PWA Playground

A template repository for Angular PWAs backed by Firebase, used for trying out Angular and Firebase updates and for prototyping ideas for future PWA projects.

## Language

**Playground**:
This repository as a working space: the Baseline plus any Prototypes, where updates are tried out and ideas are prototyped.
_Avoid_: Starter, boilerplate, sandbox

**Template**:
This repository in its role as the starting point for a new project. A new project is created from the Template and then goes its own way; changes do not flow back automatically.
_Avoid_: Fork, clone, seed

**Baseline**:
The permanent, minimal shell every future project inherits: authentication, the user profile, Firebase wiring, PWA behaviour, and the build and deploy pipeline. It stays small and never depends on any Prototype.
_Avoid_: Core, skeleton, scaffold

**Prototype**:
A self-contained, disposable feature that sits beside the Baseline. It may depend on the Baseline but never on another Prototype, and deleting it leaves the Baseline intact.
_Avoid_: Experiment, demo, module, feature (when the self-contained sense is meant)

**Live data**:
The signed-in user's Firestore data, kept up to date on this device, with whether changes are waiting to sync and whether loading failed.
_Avoid_: Realtime data, synced data, store

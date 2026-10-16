# Angular Firebase PWA Playground

A template repository for Angular PWAs backed by Firebase, used for trying out Angular and Firebase updates and for trying out ideas for future PWA projects.

## Language

**Playground**:
This repository as a working space: the Baseline plus any Features, where updates and ideas are tried out.
_Avoid_: Starter, boilerplate, sandbox

**Template**:
This repository in its role as the starting point for a new project. A new project is created from the Template and then goes its own way; changes do not flow back automatically.
_Avoid_: Fork, clone, seed

**Baseline**:
The permanent, minimal shell every future project inherits: authentication, the user profile, Firebase wiring, Live data, PWA behaviour, and the build and deploy pipeline. It stays small and never depends on any Feature.
_Avoid_: Core, skeleton, scaffold

**Feature**:
A self-contained piece of the app that sits beside the Baseline. It may depend on the Baseline but never on another Feature, and deleting it leaves the Baseline intact. In the Playground a Feature is usually thrown away once tried; in a project created from the Template it is the product. Authentication and the user profile are Baseline, never Features.
_Avoid_: Prototype, experiment, demo, module

**Live data**:
The signed-in user's Firestore data, kept up to date on this device, with whether changes are waiting to sync and whether loading failed.
_Avoid_: Realtime data, synced data, store

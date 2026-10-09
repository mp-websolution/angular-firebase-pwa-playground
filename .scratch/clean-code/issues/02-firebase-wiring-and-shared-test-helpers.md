# 02: Firebase wiring and shared integration-test helpers

**Spec:** `.scratch/clean-code/spec.md`

**What to build:**
- Apply the rules to the Firebase wiring and Live data module and their specs. Mid-function explanations become named functions, e.g. ignoring the `aborted` error that sign-out causes, deciding when `waitingToSync` is true, and reporting a rejected tracked write.
- These are generic, so their TSDoc stays: tighten it, and keep the ADR 0003 reference here.
- Extract integration-spec setup duplicated across specs into descriptively named testing helpers beside the Firebase wiring: the persistent-cache shim for jsdom, the slow-emulator wait timeout, and Node's `Blob` swap if shared. Migrate every integration spec to them.
- Spec files: no comments; local helpers get names that say what they do (e.g. writing as another device past the rules).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] No comments in function bodies in the Firebase wiring, the Live data module or their specs
- [ ] Public interfaces of `injectLiveData`, `LiveData`, providers and tokens unchanged
- [ ] Shared setup helpers exist once and every integration spec uses them; `docs/agents/testing.md` names them if it names the setup
- [ ] Test names read as Live data's specification; vague ones renamed
- [ ] `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` pass; initial bundle under budget (ADR 0003)

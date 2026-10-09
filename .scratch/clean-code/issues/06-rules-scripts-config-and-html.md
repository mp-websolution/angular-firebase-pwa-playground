# 06: Rules, scripts, config and remaining HTML

**Spec:** `.scratch/clean-code/spec.md`

**What to build:**
- **Firestore and Storage rules:** comments become rule functions, e.g. ownership, trimmed text within limits, and allowed avatar images. The Prototype begin/end markers stay. The SVG security warning stays as a one-liner.
- **Seed and icon scripts:** no comments in function bodies; extract named functions.
- **Workflows, Dependabot config, server config, editor config, ESLint config:**
  - delete comments that restate the config
  - keep reason and warning comments, e.g. keeping the Angular ignore list in step with the Angular group, plain FTP used knowingly (ADR 0002), and why hashed files may be cached for a year
  - move intent into step `name:` fields where the format allows
- The index page's comment that the theme colour must match the manifest stays.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Rules files read through named functions; Prototype markers and SVG warning kept
- [ ] Existing rules specs pass unchanged; test names reviewed as documentation
- [ ] Config files keep only reason/warning comments
- [ ] `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` pass; the `checks` workflow still runs green on the PR

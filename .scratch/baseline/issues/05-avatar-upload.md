# 05: Avatar upload

**Spec:** `.scratch/baseline/spec.md`

**What to build:** On the profile page a signed-in end user can upload an avatar image and see it shown on their profile. Files that are too large or aren't images are rejected with a clear message, both in the UI and by Storage rules. Avatars are public: anyone can view them, but no user can overwrite another user's avatar.

**Blocked by:** 04 (Profile display name)

**Status:** ready-for-agent

- [x] The profile service gains an upload-avatar command. The profile signal exposes the avatar URL
- [x] Avatars are stored at a per-user Storage path, and the profile records the avatar URL
- [x] The profile page offers file selection and shows the avatar, progress or pending state, and errors
- [x] Client-side validation of size and image type, with messages. The limits are at most 2 MB and a content type of PNG, JPEG, WebP or GIF (narrowed from `image/*` after review, see below), the same values the Storage rules enforce
- [x] Storage rules: owner-only write, a size limit of 2 MB (`request.resource.size <= 2 * 1024 * 1024`), and a content type matching `image/(png|jpeg|webp|gif)` (narrowed from `image/.*`). The owner may delete their avatar. Public read for everyone, including unauthenticated requests
- [x] Rules tests prove the owner can upload, that another user and an unauthenticated visitor can both read the avatar, and that another user's upload, an oversized file and a non-image are all denied
- [x] Component tests (seam A) cover a successful upload flow and each validation message
- [x] Integration tests (seam B) upload to the Storage emulator and show that the profile reflects the new avatar

## Comments

### Implementation notes

- `ProfileData.uploadAvatar(image: Blob)` uploads to `avatars/{uid}` in Storage, then records the download URL as `avatarUrl` in `profiles/{uid}`. `Profile.avatarUrl` is absent until the user uploads one. The upload awaits Storage, so it needs a connection: offline, the SDK keeps retrying (up to its default 10 minutes) and the page shows "Uploading…" until then. The URL write then syncs in the background like the display name.
- Replacing the avatar overwrites the same path, and Storage hands out a new download token per upload, so the URL changes and browsers don't show a cached old image (integration test).
- Storage rules (`storage.rules`): anyone reads `avatars/{uid}`, including signed-out visitors; only the owner may create, update or delete it; uploads at most 2 MB, content type PNG, JPEG, WebP or GIF. The app has no delete button yet. Rules tests: `src/app/profile/avatar-rules.integration.spec.ts`.
- Firestore rules: `isValidProfile` now allows `avatarUrl` (a string), and both fields are optional, so a user can upload an avatar before choosing a display name.
- `EditProfile` shows the avatar (or a grey placeholder) and a file input labelled "Avatar" with `accept` set to the four types. It checks type and size before uploading (same limits as the rules), disables the input and says "Uploading…" while uploading, and shows a message if the upload fails. The input is cleared after each pick, so the same file can be picked again to retry.
- Component tests: `FakeProfileData` options `avatarUrl`, `uploadFails` and `slowUpload` (with `finishUpload()`); a fake upload stores `https://storage.example/avatars/<file name>`.
- Test plumbing: under jsdom, Storage's Node build sends jsdom's Blobs, which Node's `fetch` turns into `[object Blob]`, so the emulator answers 400. The Storage rules spec runs in Node; the `ProfileData` spec needs TestBed, so it stays in jsdom and stubs `Blob` with Node's. `docs/agents/testing.md` describes this.
- The upload functions from `firebase/storage` land in the initial bundle, since Storage is already eager there: initial total 450 kB (was 438 kB), within the 500 kB budget.
- Checked in the browser against the emulators: uploading a PNG shows it; a file over 2 MB shows the size message.

### Decision after review: narrower types, owner delete

- Avatars are public, and `image/*` let SVG through. SVG can carry scripts, which would run when someone opens the download URL directly. The user chose an allowlist instead: PNG, JPEG, WebP and GIF, both in the rules and in the page.
- The user chose to let owners delete their avatar in the rules. Other users and signed-out visitors still can't.

# 05: Avatar upload

**Spec:** `.scratch/baseline/spec.md`

**What to build:** On the profile page a signed-in end user can upload an avatar image and see it shown on their profile. Files that are too large or aren't images are rejected with a clear message, both in the UI and by Storage rules. Avatars are public: anyone can view them, but no user can overwrite another user's avatar.

**Blocked by:** 04 (Profile display name)

**Status:** ready-for-agent

- [ ] The profile service gains an upload-avatar command. The profile signal exposes the avatar URL
- [ ] Avatars are stored at a per-user Storage path, and the profile records the avatar URL
- [ ] The profile page offers file selection and shows the avatar, progress or pending state, and errors
- [ ] Client-side validation of size and image type, with messages. The limits are at most 2 MB and a content type matching `image/*`, the same values the Storage rules enforce
- [ ] Storage rules: owner-only write, a size limit of 2 MB (`request.resource.size <= 2 * 1024 * 1024`), and a content type matching `image/.*`. Public read for everyone, including unauthenticated requests
- [ ] Rules tests prove the owner can upload, that another user and an unauthenticated visitor can both read the avatar, and that another user's upload, an oversized file and a non-image are all denied
- [ ] Component tests (seam A) cover a successful upload flow and each validation message
- [ ] Integration tests (seam B) upload to the Storage emulator and show that the profile reflects the new avatar

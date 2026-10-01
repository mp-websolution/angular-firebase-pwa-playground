# FTP deploy to existing webspace instead of Firebase Hosting

The frontend is deployed via FTP (`SamKirkland/FTP-Deploy-Action`) to webspace that is already paid for together with the domain and email, instead of Firebase Hosting. Firebase serves as backend only (Auth, Firestore, Storage); rules and indexes are deployed separately with `firebase deploy`.

## Consequences

- Static client build only: no SSR, no Firebase Hosting rewrites or preview channels. SPA fallback and cache headers live in an `.htaccess` shipped with the build.
- The plan offers no SFTP, and plain FTP was accepted knowingly: credentials travel unencrypted from CI.
- Frontend and rules deploy through two different channels and must be triggered together from the same commit to avoid drift.
- Google sign-in uses `signInWithPopup` only: `signInWithRedirect` depends on the `/__/auth/*` handler being same-origin, which Firebase Hosting provides and our webspace does not.

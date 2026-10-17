export type AuthFailure =
  | 'invalid-credential'
  | 'invalid-email'
  | 'email-in-use'
  | 'weak-password'
  | 'popup-closed'
  | 'popup-blocked'
  | 'too-many-requests'
  | 'offline'
  | 'other-tabs-open'
  | 'unknown';

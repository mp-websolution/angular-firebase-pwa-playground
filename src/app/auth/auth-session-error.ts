/** Why an auth session command failed, in the app's words rather than the SDK's error codes. */
export type AuthFailure =
  | 'wrong-password'
  | 'user-not-found'
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

const messageByReason: Record<AuthFailure, string> = {
  'wrong-password': 'Wrong password. Try again.',
  'user-not-found': 'No account uses this email. Create one first.',
  // Firebase gives this instead of the two above when email enumeration protection is on.
  'invalid-credential': 'Wrong email or password.',
  'invalid-email': 'Enter a valid email address.',
  'email-in-use': 'An account with this email already exists. Sign in instead.',
  'weak-password': 'Choose a password with at least 6 characters.',
  'popup-closed': 'The Google sign-in window was closed before you finished.',
  'popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
  'too-many-requests': 'Too many attempts. Wait a moment, then try again.',
  offline: "Can't reach the server. Check your connection and try again.",
  'other-tabs-open': 'Close the app in your other tabs, then sign out again.',
  unknown: 'Something went wrong. Try again.',
};

/** A failed auth session command. Its message is ready to show to the user. */
export class AuthSessionError extends Error {
  override readonly name = 'AuthSessionError';

  constructor(
    readonly reason: AuthFailure,
    options?: ErrorOptions,
  ) {
    super(messageByReason[reason], options);
  }
}

/** The message to show for an error thrown by an auth session command. */
export function messageOf(error: unknown): string {
  return (error instanceof AuthSessionError ? error : new AuthSessionError('unknown')).message;
}

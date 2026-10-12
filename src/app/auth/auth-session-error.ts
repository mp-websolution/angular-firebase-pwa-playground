import { AuthFailure } from './auth-failure.model';

const failures: Record<AuthFailure, { message: string; userFixable: boolean }> = {
  'invalid-credential': { message: 'Wrong email or password.', userFixable: true },
  'invalid-email': { message: 'Enter a valid email address.', userFixable: true },
  'email-in-use': {
    message: 'An account with this email already exists. Sign in instead.',
    userFixable: true,
  },
  'weak-password': {
    message: 'Choose a password with at least 6 characters.',
    userFixable: true,
  },
  'popup-closed': {
    message: 'The Google sign-in window was closed before you finished.',
    userFixable: false,
  },
  'popup-blocked': {
    message: 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
    userFixable: false,
  },
  'too-many-requests': {
    message: 'Too many attempts. Wait a moment, then try again.',
    userFixable: false,
  },
  offline: {
    message: "Can't reach the server. Check your connection and try again.",
    userFixable: false,
  },
  'other-tabs-open': {
    message: 'Close the app in your other tabs, then sign out again.',
    userFixable: false,
  },
  unknown: { message: 'Something went wrong. Try again.', userFixable: false },
};

export class AuthSessionError extends Error {
  override readonly name = 'AuthSessionError';

  constructor(
    readonly reason: AuthFailure,
    options?: ErrorOptions,
  ) {
    super(failures[reason].message, options);
  }
}

export function userFixable(error: unknown): error is AuthSessionError {
  return error instanceof AuthSessionError && failures[error.reason].userFixable;
}

export function messageOf(error: unknown): string {
  return (error instanceof AuthSessionError ? error : new AuthSessionError('unknown')).message;
}

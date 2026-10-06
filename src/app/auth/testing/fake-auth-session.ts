import { signal } from '@angular/core';
import type { AuthSession } from '../auth-session';
import { AuthSessionError } from '../auth-session-error';
import { Credentials } from '../credentials.model';
import { SessionUser } from '../session-user.model';

// `implements AuthSession` would also demand its `#private` fields; this keeps only the public ones.
type PublicApi<T> = { [K in keyof T]: T[K] }; //todo: after feature extract this to a common palce, exists at least 4 times.

export interface FakeAuthSessionOptions {
  /** Email/password accounts that exist before the test starts. */
  accounts?: Credentials[];
  /** Starts with this email/password account signed in. */
  signedInAs?: string;
  /** What happens in the Google popup: the user picks this account, or closes it (the default). */
  googlePopup?: { email: string } | 'closed';
  /** Starts unresolved, as if restoring this user's session until `finishRestoring()`. */
  restoring?: string;
  /** Sign-out fails as if other tabs kept the cache from being deleted. */
  otherTabsOpen?: boolean;
}

/** An in-memory stand-in for `AuthSession` that behaves like Firebase Auth for component tests. */
export class FakeAuthSession implements PublicApi<AuthSession> {
  readonly #user = signal<SessionUser | null>(null);
  readonly #resolved = signal(true);
  #finishResolving!: () => void;
  readonly #whenResolved = new Promise<void>((resolve) => (this.#finishResolving = resolve));

  readonly user = this.#user.asReadonly();
  readonly resolved = this.#resolved.asReadonly();

  readonly #passwords = new Map<string, string>();
  readonly #googlePopup: { email: string } | 'closed';
  readonly #restoring?: string;
  readonly #otherTabsOpen: boolean;

  constructor({
    accounts = [],
    signedInAs,
    googlePopup = 'closed',
    restoring,
    otherTabsOpen = false,
  }: FakeAuthSessionOptions = {}) {
    for (const { email, password } of accounts) {
      this.#passwords.set(email, password);
    }
    if (signedInAs) {
      this.#user.set(fakeUser(signedInAs));
    }
    this.#googlePopup = googlePopup;
    this.#restoring = restoring;
    this.#resolved.set(!restoring);
    if (!restoring) {
      this.#finishResolving();
    }
    this.#otherTabsOpen = otherTabsOpen;
  }

  /** Ends the restore started with the `restoring` option. */
  finishRestoring(): void {
    this.#user.set(this.#restoring ? fakeUser(this.#restoring) : null);
    this.#resolved.set(true);
    this.#finishResolving();
  }

  whenResolved(): Promise<void> {
    return this.#whenResolved;
  }

  async signUpWithEmail({ email, password }: Credentials): Promise<void> {
    if (this.#passwords.has(email)) {
      throw new AuthSessionError('email-in-use');
    }
    if (password.length < 6) {
      throw new AuthSessionError('weak-password');
    }
    this.#passwords.set(email, password);
    this.#user.set(fakeUser(email));
  }

  async signInWithEmail({ email, password }: Credentials): Promise<void> {
    if (this.#passwords.get(email) !== password) {
      throw new AuthSessionError('invalid-credential');
    }
    this.#user.set(fakeUser(email));
  }

  async signInWithGoogle(): Promise<void> {
    if (this.#googlePopup === 'closed') {
      throw new AuthSessionError('popup-closed');
    }
    this.#user.set(fakeUser(this.#googlePopup.email));
  }

  async signOut(): Promise<void> {
    if (this.#otherTabsOpen) {
      throw new AuthSessionError('other-tabs-open');
    }
    this.#user.set(null);
  }
}

function fakeUser(email: string): SessionUser {
  return { uid: `uid-${email}`, email, displayName: null };
}

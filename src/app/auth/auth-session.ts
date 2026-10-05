import { DestroyRef, Service, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { filter, firstValueFrom } from 'rxjs';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIREBASE_AUTH, FIRESTORE, signOutAndClearCache } from '../firebase/provide-firebase';
import { AuthFailure } from './auth-failure.model';
import { AuthSessionError } from './auth-session-error';
import { Credentials } from './credentials.model';
import { SessionUser } from './session-user.model';

/** Who is signed in, plus the commands that change it. Components and guards never touch the SDK. */
@Service()
export class AuthSession {
  readonly #auth = inject(FIREBASE_AUTH);
  // Only loaded on sign-out, so Firestore stays out of the initial load.
  readonly #loadFirestore = inject(FIRESTORE);
  readonly #reloadPage = inject(RELOAD_PAGE);
  readonly #user = signal<SessionUser | null>(null);
  readonly #resolved = signal(false);

  /** The signed-in user, or `null`. Only meaningful once `resolved` is true. */
  readonly user = this.#user.asReadonly();
  /** False until Auth has restored (or ruled out) the session from the previous visit. */
  readonly resolved = this.#resolved.asReadonly();
  readonly #resolved$ = toObservable(this.#resolved);

  constructor() {
    const unsubscribe = onAuthStateChanged(this.#auth, (user) => {
      const previousUid = this.#user()?.uid;
      this.#user.set(user && toSessionUser(user));
      this.#resolved.set(true);
      // The user went away, signed out here or in another tab: reload, so no page keeps showing
      // their data, and Firestore restarts after sign-out has terminated it.
      if (previousUid && previousUid !== user?.uid) {
        this.#reloadPage();
      }
    });
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  /** Settles once `resolved` is true, so `user` can be trusted. */
  async whenResolved(): Promise<void> {
    if (!this.#resolved()) {
      await firstValueFrom(this.#resolved$.pipe(filter(Boolean)));
    }
  }

  /** Creates an email/password account and signs it in. Rejects with an `AuthSessionError`. */
  async signUpWithEmail({ email, password }: Credentials): Promise<void> {
    await this.#signIn(() => createUserWithEmailAndPassword(this.#auth, email, password));
  }

  /**
   * Rejects with an `AuthSessionError`. A wrong password and an unknown email fail alike, as
   * `invalid-credential`, so the error doesn't reveal which emails have accounts.
   */
  async signInWithEmail({ email, password }: Credentials): Promise<void> {
    await this.#signIn(() => signInWithEmailAndPassword(this.#auth, email, password));
  }

  /** Signs in with Google in a popup; a redirect would need Firebase Hosting (ADR 0002). */
  async signInWithGoogle(): Promise<void> {
    await this.#signIn(() => signInWithPopup(this.#auth, new GoogleAuthProvider()));
  }

  /**
   * Deletes Firestore's on-disk cache, so the next person on the device cannot read this user's
   * documents, then signs out, which reloads the page (see the auth state listener). Rejects with
   * an `AuthSessionError`; if the cache cannot be deleted, the user stays signed in.
   */
  async signOut(): Promise<void> {
    try {
      await signOutAndClearCache(this.#auth, this.#loadFirestore);
    } catch (error) {
      // Defensive: with today's SDK, other tabs shut their Firestore down when the cache is
      // deleted instead of blocking it. If one ever holds on to it, ask to close it.
      throw error instanceof FirebaseError && error.code === 'failed-precondition'
        ? new AuthSessionError('other-tabs-open', { cause: error })
        : toAuthSessionError(error);
    }
  }

  async #signIn(attempt: () => Promise<{ user: User }>): Promise<void> {
    try {
      const { user } = await attempt();
      this.#user.set(toSessionUser(user));
    } catch (error) {
      throw toAuthSessionError(error);
    }
  }
}

function toSessionUser({ uid, email, displayName }: User): SessionUser {
  return { uid, email, displayName };
}

const reasonByFirebaseCode: Record<string, AuthFailure> = {
  'auth/wrong-password': 'invalid-credential',
  'auth/user-not-found': 'invalid-credential',
  'auth/invalid-credential': 'invalid-credential',
  'auth/invalid-login-credentials': 'invalid-credential',
  'auth/invalid-email': 'invalid-email',
  'auth/email-already-in-use': 'email-in-use',
  'auth/weak-password': 'weak-password',
  'auth/popup-closed-by-user': 'popup-closed',
  'auth/cancelled-popup-request': 'popup-closed',
  'auth/popup-blocked': 'popup-blocked',
  'auth/too-many-requests': 'too-many-requests',
  'auth/network-request-failed': 'offline',
};

function toAuthSessionError(error: unknown): AuthSessionError {
  const reason = (error instanceof FirebaseError && reasonByFirebaseCode[error.code]) || 'unknown';
  return new AuthSessionError(reason, { cause: error });
}

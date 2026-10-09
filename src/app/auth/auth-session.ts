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

@Service()
export class AuthSession {
  readonly #auth = inject(FIREBASE_AUTH);
  readonly #loadFirestoreOnlyOnSignOut = inject(FIRESTORE);
  readonly #reloadPage = inject(RELOAD_PAGE);
  readonly #user = signal<SessionUser | null>(null);
  readonly #resolved = signal(false);

  readonly user = this.#user.asReadonly();
  readonly resolved = this.#resolved.asReadonly();
  readonly #resolved$ = toObservable(this.#resolved);

  constructor() {
    const unsubscribe = onAuthStateChanged(this.#auth, (user) => {
      const previousUid = this.#user()?.uid;
      this.#user.set(user && toSessionUser(user));
      this.#resolved.set(true);
      if (theUserWentAway(previousUid, user)) {
        this.#reloadSoNoPageKeepsShowingTheirDataAndFirestoreRestarts();
      }
    });
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  async whenResolved(): Promise<void> {
    if (!this.#resolved()) {
      await firstValueFrom(this.#resolved$.pipe(filter(Boolean)));
    }
  }

  async signUpWithEmail({ email, password }: Credentials): Promise<void> {
    await this.#signInAndSetTheUserRightAway(() =>
      createUserWithEmailAndPassword(this.#auth, email, password),
    );
  }

  async signInWithEmail({ email, password }: Credentials): Promise<void> {
    await this.#signInAndSetTheUserRightAway(() =>
      signInWithEmailAndPassword(this.#auth, email, password),
    );
  }

  async signInWithGoogle(): Promise<void> {
    await this.#signInAndSetTheUserRightAway(() =>
      signInWithPopup(this.#auth, new GoogleAuthProvider()),
    );
  }

  async signOut(): Promise<void> {
    try {
      await signOutAndClearCache(this.#auth, this.#loadFirestoreOnlyOnSignOut);
    } catch (error) {
      throw toSignOutError(error);
    }
  }

  #reloadSoNoPageKeepsShowingTheirDataAndFirestoreRestarts(): void {
    this.#reloadPage();
  }

  async #signInAndSetTheUserRightAway(attempt: () => Promise<{ user: User }>): Promise<void> {
    try {
      const { user } = await attempt();
      this.#user.set(toSessionUser(user));
    } catch (error) {
      throw toAuthSessionError(error);
    }
  }
}

function theUserWentAway(previousUid: string | undefined, user: User | null): boolean {
  return !!previousUid && previousUid !== user?.uid;
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

function toSignOutError(error: unknown): AuthSessionError {
  return anotherTabHoldsOnToTheCache(error)
    ? new AuthSessionError('other-tabs-open', { cause: error })
    : toAuthSessionError(error);
}

function anotherTabHoldsOnToTheCache(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === 'failed-precondition';
}

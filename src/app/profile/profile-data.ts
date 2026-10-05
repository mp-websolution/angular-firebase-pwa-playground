import { DestroyRef, ErrorHandler, Service, inject, signal } from '@angular/core';
import { DocumentReference, Unsubscribe, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AuthSession } from '../auth/auth-session';
import { FIREBASE_STORAGE, FIRESTORE } from '../firebase/provide-firebase';
import { Profile } from './profile.model';

/**
 * The signed-in user's profile, kept up to date, plus the commands that change it. Imports the
 * Firestore SDK, so only lazy routes may reach it (ADR 0003).
 */
@Service()
export class ProfileData {
  readonly #loadFirestore = inject(FIRESTORE);
  readonly #storage = inject(FIREBASE_STORAGE);
  readonly #errorHandler = inject(ErrorHandler);
  // The profile page is guarded, so someone is signed in. Whenever that user goes away, the page
  // reloads (see AuthSession), so the uid never changes for this instance.
  readonly #uid = inject(AuthSession).user()?.uid;
  readonly #profile = signal<Profile | undefined>(undefined);
  readonly #waitingToSync = signal(false);
  readonly #loadFailed = signal(false);

  /** The signed-in user's profile; `undefined` until it has loaded. */
  readonly profile = this.#profile.asReadonly();
  /** True while changes made on this device can't reach the server, e.g. offline. */
  readonly waitingToSync = this.#waitingToSync.asReadonly();
  /** True when the profile can't be loaded, e.g. Firestore refused to read it. */
  readonly loadFailed = this.#loadFailed.asReadonly();

  constructor() {
    let unsubscribe: Unsubscribe | undefined;
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      unsubscribe?.();
    });
    const fail = (error: unknown) => {
      this.#loadFailed.set(true);
      this.#errorHandler.handleError(error);
    };
    this.#profileRef().then((profileRef) => {
      if (destroyed) {
        return;
      }
      // Metadata changes too, so `waitingToSync` follows the connection and the server's replies.
      unsubscribe = onSnapshot(
        profileRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          this.#profile.set({
            displayName: snapshot.get('displayName') ?? '',
            avatarUrl: snapshot.get('avatarUrl'),
          });
          // Online, every change is pending for a moment too; only `fromCache` means the
          // listener has lost the server.
          const { hasPendingWrites, fromCache } = snapshot.metadata;
          this.#waitingToSync.set(hasPendingWrites && fromCache);
        },
        (error) => {
          // Sign-out, here or in another tab, shuts Firestore down and reloads the page: nothing failed.
          if (error.code !== 'aborted') {
            fail(error);
          }
        },
      );
    }, fail);
  }

  /**
   * Saves the display name on this device and syncs it in the background, so it also works
   * offline: `profile` shows it straight away, and `waitingToSync` stays true until it's back online.
   */
  async updateDisplayName(displayName: string): Promise<void> {
    const profileRef = await this.#profileRef();
    // Not awaited: offline, it would only settle once back online.
    setDoc(profileRef, { displayName }, { merge: true }).catch((error: unknown) => {
      // The page only sends what the rules accept, so a rejection is a bug. Firestore has
      // already undone the change, so `profile` shows what the server kept.
      this.#errorHandler.handleError(error);
    });
  }

  /**
   * Uploads the image as the avatar, replacing the previous one, then records its URL in the
   * profile, so `profile` shows it. Unlike the display name, the upload needs a connection: it
   * settles once the image is in Storage, and rejects if the upload fails.
   */
  async uploadAvatar(image: Blob): Promise<void> {
    const profileRef = await this.#profileRef();
    // One avatar per user, at a path only they may write (storage.rules).
    const avatarRef = ref(this.#storage, `avatars/${profileRef.id}`);
    await uploadBytes(avatarRef, image);
    const avatarUrl = await getDownloadURL(avatarRef);
    // Not awaited, like the display name: the URL syncs in the background.
    setDoc(profileRef, { avatarUrl }, { merge: true }).catch((error: unknown) => {
      this.#errorHandler.handleError(error);
    });
  }

  async #profileRef(): Promise<DocumentReference> {
    if (!this.#uid) {
      throw new Error('ProfileData needs a signed-in user.');
    }
    return doc(await this.#loadFirestore(), 'profiles', this.#uid);
  }
}

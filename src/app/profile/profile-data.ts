import { Service, inject } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { injectLiveData } from '../firebase/inject-live-data';
import { FIREBASE_STORAGE } from '../firebase/provide-firebase';
import { Profile } from './profile.model';

/**
 * The signed-in user's profile, kept up to date, plus the commands that change it. Imports the
 * Firestore SDK, so only lazy routes may reach it (ADR 0003).
 */
@Service()
export class ProfileData {
  readonly #storage = inject(FIREBASE_STORAGE);
  readonly #live = injectLiveData({
    ref: (firestore, uid) => doc(firestore, 'profiles', uid),
    map: (snapshot): Profile => ({
      displayName: snapshot.get('displayName') ?? '',
      avatarUrl: snapshot.get('avatarUrl'),
    }),
  });

  /** The signed-in user's profile; `undefined` until it has loaded. */
  readonly profile = this.#live.value;
  /** True while changes made on this device can't reach the server, e.g. offline. */
  readonly waitingToSync = this.#live.waitingToSync;
  /** True when the profile can't be loaded, e.g. Firestore refused to read it. */
  readonly loadFailed = this.#live.loadFailed;

  /**
   * Saves the display name on this device and syncs it in the background, so it also works
   * offline: `profile` shows it straight away, and `waitingToSync` stays true until it's back online.
   */
  async updateDisplayName(displayName: string): Promise<void> {
    this.#live.track(setDoc(await this.#live.ref(), { displayName }, { merge: true }));
  }

  /**
   * Uploads the image as the avatar, replacing the previous one, then records its URL in the
   * profile, so `profile` shows it. Unlike the display name, the upload needs a connection: it
   * settles once the image is in Storage, and rejects if the upload fails. Needs a saved display
   * name: the Firestore rules take no avatar URL on a profile without one.
   */
  async uploadAvatar(image: Blob): Promise<void> {
    const profileRef = await this.#live.ref();
    // One avatar per user, at a path only they may write (storage.rules).
    const avatarRef = ref(this.#storage, `avatars/${profileRef.id}`);
    await uploadBytes(avatarRef, image);
    const avatarUrl = await getDownloadURL(avatarRef);
    // Like the display name, the URL syncs in the background. The page only offers an upload once a
    // display name is saved, and the rules then accept any URL string, so a rejection is a bug.
    this.#live.track(setDoc(profileRef, { avatarUrl }, { merge: true }));
  }
}

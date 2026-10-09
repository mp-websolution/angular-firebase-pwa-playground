import { Service, inject } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { injectLiveData } from '../firebase/inject-live-data';
import { FIREBASE_STORAGE } from '../firebase/provide-firebase';
import { Profile } from './profile.model';

@Service()
export class ProfileData {
  readonly #storage = inject(FIREBASE_STORAGE);
  readonly #live = injectLiveData({
    refFor: (firestore, uid) => doc(firestore, 'profiles', uid),
    map: (snapshot): Profile => ({
      displayName: snapshot.get('displayName') ?? '',
      avatarUrl: snapshot.get('avatarUrl'),
    }),
  });

  readonly profile = this.#live.value;
  readonly waitingToSync = this.#live.waitingToSync;
  readonly loadFailed = this.#live.loadFailed;

  async updateDisplayName(displayName: string): Promise<void> {
    this.#live.track(setDoc(await this.#live.ref(), { displayName }, { merge: true }));
  }

  async uploadAvatar(image: Blob): Promise<void> {
    const profileRef = await this.#live.ref();
    const avatarUrl = await this.#storeAvatarWhereOnlyItsOwnerMayWrite(profileRef.id, image);
    this.#live.track(setDoc(profileRef, { avatarUrl }, { merge: true }));
  }

  async #storeAvatarWhereOnlyItsOwnerMayWrite(uid: string, image: Blob): Promise<string> {
    const avatarRef = ref(this.#storage, `avatars/${uid}`);
    await uploadBytes(avatarRef, image);
    return getDownloadURL(avatarRef);
  }
}

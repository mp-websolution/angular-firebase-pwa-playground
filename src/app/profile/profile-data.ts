import { Service } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { injectLiveData } from '../live-data/inject-live-data';
import { Profile } from './profile.model';

@Service()
export class ProfileData {
  readonly #live = injectLiveData({
    userRefFor: (firestore, uid) => doc(firestore, 'profiles', uid),
    map: (snapshot): Profile => ({
      displayName: snapshot.get('displayName') ?? '',
    }),
  });

  readonly profile = this.#live.value;
  readonly waitingToSync = this.#live.waitingToSync;
  readonly loadFailed = this.#live.loadFailed;

  async updateDisplayName(displayName: string): Promise<void> {
    this.#live.track(setDoc(await this.#live.ref(), { displayName }, { merge: true }));
  }
}

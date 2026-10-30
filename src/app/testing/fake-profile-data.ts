import { signal } from '@angular/core';
import type { ProfileData } from '../profile/profile-data';
import { Profile } from '../profile/profile.model';

type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeProfileDataOptions {
  /** The display name stored before the test starts. */
  displayName?: string;
  /** Changes stay on this device, as if offline, so they keep waiting to sync. */
  offline?: boolean;
  /** The profile can't be loaded, e.g. Firestore refused to read it. */
  loadFails?: boolean;
}

export class FakeProfileData implements PublicApi<ProfileData> {
  readonly #profile = signal<Profile | undefined>(undefined);
  readonly #waitingToSync = signal(false);
  readonly #loadFailed = signal(false);

  readonly profile = this.#profile.asReadonly();
  readonly waitingToSync = this.#waitingToSync.asReadonly();
  readonly loadFailed = this.#loadFailed.asReadonly();

  readonly #offline: boolean;

  constructor({
    displayName = '',
    offline = false,
    loadFails = false,
  }: FakeProfileDataOptions = {}) {
    if (loadFails) {
      this.#loadFailed.set(true);
    } else {
      this.#profile.set({ displayName });
    }
    this.#offline = offline;
  }

  changeElsewhere(displayName: string): void {
    this.#profile.update((profile) => ({ ...profile, displayName }));
  }

  async updateDisplayName(displayName: string): Promise<void> {
    this.#profile.update((profile) => ({ ...profile, displayName }));
    this.#waitingToSync.set(this.#offline);
  }
}

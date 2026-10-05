import { signal } from '@angular/core';
import type { ProfileData } from '../profile-data';
import { Profile } from '../profile.model';

// `implements ProfileData` would also demand its `#private` fields; this keeps only the public ones.
type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeProfileDataOptions {
  /** The display name stored before the test starts. */
  displayName?: string;
  /** Changes stay on this device, as if offline, so they never finish syncing. */
  offline?: boolean;
  /** The profile can't be loaded, e.g. Firestore refused to read it. */
  loadFails?: boolean;
}

/** An in-memory stand-in for `ProfileData` that behaves like Firestore for component tests. */
export class FakeProfileData implements PublicApi<ProfileData> {
  readonly #profile = signal<Profile | undefined>(undefined);
  readonly #syncing = signal(false);
  readonly #loadFailed = signal(false);

  readonly profile = this.#profile.asReadonly();
  readonly syncing = this.#syncing.asReadonly();
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

  async updateDisplayName(displayName: string): Promise<void> {
    this.#profile.set({ displayName });
    this.#syncing.set(this.#offline);
  }
}

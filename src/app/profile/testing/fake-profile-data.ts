import { signal } from '@angular/core';
import type { ProfileData } from '../profile-data';
import { Profile } from '../profile.model';

type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeProfileDataOptions {
  /** The display name stored before the test starts. */
  displayName?: string;
  /** The avatar uploaded before the test starts. */
  avatarUrl?: string;
  /** Changes stay on this device, as if offline, so they keep waiting to sync. */
  offline?: boolean;
  /** The profile can't be loaded, e.g. Firestore refused to read it. */
  loadFails?: boolean;
  /** Avatar uploads fail, e.g. because the connection dropped. */
  uploadFails?: boolean;
  /** Avatar uploads stay in progress until `finishUpload()`. */
  slowUpload?: boolean;
}

export class FakeProfileData implements PublicApi<ProfileData> {
  readonly #profile = signal<Profile | undefined>(undefined);
  readonly #waitingToSync = signal(false);
  readonly #loadFailed = signal(false);

  readonly profile = this.#profile.asReadonly();
  readonly waitingToSync = this.#waitingToSync.asReadonly();
  readonly loadFailed = this.#loadFailed.asReadonly();

  readonly #offline: boolean;
  readonly #uploadFails: boolean;
  readonly #slowUpload: boolean;
  #finishUpload?: () => void;

  constructor({
    displayName = '',
    avatarUrl,
    offline = false,
    loadFails = false,
    uploadFails = false,
    slowUpload = false,
  }: FakeProfileDataOptions = {}) {
    if (loadFails) {
      this.#loadFailed.set(true);
    } else {
      this.#profile.set({ displayName, avatarUrl });
    }
    this.#offline = offline;
    this.#uploadFails = uploadFails;
    this.#slowUpload = slowUpload;
  }

  changeElsewhere(displayName: string): void {
    this.#profile.update((profile) => ({ ...profile, displayName }));
  }

  finishUpload(): void {
    this.#finishUpload?.();
  }

  async updateDisplayName(displayName: string): Promise<void> {
    this.#profile.update((profile) => ({ ...profile, displayName }));
    this.#waitingToSync.set(this.#offline);
  }

  async uploadAvatar(image: Blob): Promise<void> {
    if (this.#slowUpload) {
      await new Promise<void>((resolve) => (this.#finishUpload = resolve));
    }
    if (this.#uploadFails) {
      throw new Error('Upload failed.');
    }
    const avatarUrl = avatarUrlNamedAfterTheFile(image);
    this.#profile.update((profile) => ({ displayName: '', ...profile, avatarUrl }));
  }
}

function avatarUrlNamedAfterTheFile(image: Blob): string {
  return `https://storage.example/avatars/${image instanceof File ? image.name : 'avatar'}`;
}

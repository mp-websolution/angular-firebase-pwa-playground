import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormField,
  FormRoot,
  TreeValidationResult,
  ValidationResult,
  form,
  validate,
} from '@angular/forms/signals';
import { ProfileData } from '../../profile-data';

// Same limits as the Storage rules. No SVG: it can carry scripts.
const avatarTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const maxAvatarBytes = 2 * 1024 * 1024;

interface ProfileModel {
  displayName: string;
}

@Component({
  selector: 'app-edit-profile',
  imports: [FormField, FormRoot, RouterLink],
  templateUrl: './edit-profile.html',
})
export class EditProfile {
  protected readonly profileData = inject(ProfileData);

  readonly #profileModel = linkedSignal<string, ProfileModel>({
    source: () => this.profileData.profile()?.displayName ?? '',
    computation: followTheStoredNameButKeepUnsavedTyping,
  });
  protected readonly profileForm = form(
    this.#profileModel,
    (path) => {
      validate(path.displayName, ({ value }) =>
        whatTheFirestoreRulesWouldRejectInTheTrimmedName(value().trim()),
      );
    },
    {
      submission: {
        action: () => this.#updateDisplayName(),
      },
    },
  );

  readonly #savedDisplayName = signal<string | undefined>(undefined);
  protected readonly saved = computed(
    () => this.#savedDisplayName() === this.#profileModel().displayName,
  );

  protected readonly avatarAccept = avatarTypes.join(',');
  protected readonly avatarStatus = signal<
    'idle' | 'wrong-type' | 'too-large' | 'uploading' | 'failed'
  >('idle');

  protected async uploadAvatar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0];
    this.#letSameFileBePickedAgain(input);
    if (!image) {
      return;
    }
    if (!avatarTypes.includes(image.type)) {
      this.avatarStatus.set('wrong-type');
      return;
    }
    if (image.size > maxAvatarBytes) {
      this.avatarStatus.set('too-large');
      return;
    }
    this.avatarStatus.set('uploading');
    try {
      await this.profileData.uploadAvatar(image);
      this.avatarStatus.set('idle');
    } catch {
      this.avatarStatus.set('failed');
    }
  }

  async #updateDisplayName(): Promise<TreeValidationResult> {
    const displayName = this.#profileModel().displayName.trim();
    this.#showWhatGetsStoredAndFollowTheStoredNameAgain(displayName);
    await this.profileData.updateDisplayName(displayName);
    this.#savedDisplayName.set(displayName);
  }

  #letSameFileBePickedAgain(input: HTMLInputElement): void {
    input.value = '';
  }

  #showWhatGetsStoredAndFollowTheStoredNameAgain(displayName: string): void {
    this.#profileModel.set({ displayName });
  }
}

function followTheStoredNameButKeepUnsavedTyping(
  displayName: string,
  previous?: { source: string; value: ProfileModel },
): ProfileModel {
  return previous && previous.value.displayName !== previous.source
    ? previous.value
    : { displayName };
}

function whatTheFirestoreRulesWouldRejectInTheTrimmedName(trimmedName: string): ValidationResult {
  if (!trimmedName) {
    return { kind: 'required', message: 'Enter a display name.' };
  }
  if (trimmedName.length < 2) {
    return { kind: 'minLength', message: 'Use at least 2 characters.' };
  }
  return trimmedName.length > 50
    ? { kind: 'maxLength', message: 'Use at most 50 characters.' }
    : undefined;
}

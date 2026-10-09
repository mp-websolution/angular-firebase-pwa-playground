import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, ValidationResult, form, submit, validate } from '@angular/forms/signals';
import { ProfileData } from '../profile-data';

// Same limits as the Storage rules. No SVG: it can carry scripts.
const avatarTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const maxAvatarBytes = 2 * 1024 * 1024;

interface ProfileForm {
  displayName: string;
}

@Component({
  selector: 'app-edit-profile',
  imports: [FormField, RouterLink],
  templateUrl: './edit-profile.html',
})
export class EditProfile {
  protected readonly profileData = inject(ProfileData);

  protected readonly profileForm = form(
    linkedSignal<string, ProfileForm>({
      source: () => this.profileData.profile()?.displayName ?? '',
      computation: followTheStoredNameButKeepUnsavedTyping,
    }),
    (path) => {
      validate(path.displayName, ({ value }) =>
        whatTheFirestoreRulesWouldRejectInTheTrimmedName(value().trim()),
      );
    },
  );

  readonly #savedDisplayName = signal<string | undefined>(undefined);
  protected readonly saved = computed(
    () => this.#savedDisplayName() === this.profileForm.displayName().value(),
  );

  protected readonly avatarAccept = avatarTypes.join(',');
  protected readonly avatarStatus = signal<
    'idle' | 'wrong-type' | 'too-large' | 'uploading' | 'failed'
  >('idle');

  protected async uploadAvatar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0];
    this.#letTheSameFileBePickedAgain(input);
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

  protected saveProfile(): void {
    submit(this.profileForm, async () => {
      const displayName = this.profileForm.displayName().value().trim();
      this.#showWhatGetsStoredAndFollowTheStoredNameAgain(displayName);
      await this.profileData.updateDisplayName(displayName);
      this.#savedDisplayName.set(displayName);
    });
  }

  #letTheSameFileBePickedAgain(input: HTMLInputElement): void {
    input.value = '';
  }

  #showWhatGetsStoredAndFollowTheStoredNameAgain(displayName: string): void {
    this.profileForm.displayName().value.set(displayName);
  }
}

function followTheStoredNameButKeepUnsavedTyping(
  displayName: string,
  previous?: { source: string; value: ProfileForm },
): ProfileForm {
  return previous && previous.value.displayName !== previous.source
    ? previous.value
    : { displayName };
}

function whatTheFirestoreRulesWouldRejectInTheTrimmedName(displayName: string): ValidationResult {
  if (!displayName) {
    return { kind: 'required', message: 'Enter a display name.' };
  }
  if (displayName.length < 2) {
    return { kind: 'minLength', message: 'Use at least 2 characters.' };
  }
  return displayName.length > 50
    ? { kind: 'maxLength', message: 'Use at most 50 characters.' }
    : undefined;
}

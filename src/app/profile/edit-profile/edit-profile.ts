import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, submit, validate } from '@angular/forms/signals';
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
      // Follows the stored display name, e.g. once it has loaded or after a change in another
      // tab, but keeps what the user typed and hasn't saved yet.
      computation: (displayName, previous) =>
        previous && previous.value.displayName !== previous.source
          ? previous.value
          : { displayName },
    }),
    (path) => {
      validate(path.displayName, ({ value }) => {
        const displayName = value().trim();
        if (!displayName) {
          return { kind: 'required', message: 'Enter a display name.' };
        }
        // Same limits as the Firestore rules, which see the trimmed name.
        if (displayName.length < 2) {
          return { kind: 'minLength', message: 'Use at least 2 characters.' };
        }
        return displayName.length > 50
          ? { kind: 'maxLength', message: 'Use at most 50 characters.' }
          : undefined;
      });
    },
  );

  readonly #savedDisplayName = signal<string | undefined>(undefined);
  /** Whether the form shows what was just saved, so "Saved." goes away once the user edits. */
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
    // Browsers only report a change when the selection changes; clear it so the same file can be
    // picked again, e.g. to retry a failed upload.
    input.value = '';
    if (!image) {
      return;
    }
    // `accept` only suggests these types; the user can still pick any file.
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
      // Show what gets stored; also ends the draft, so the form follows the stored name again.
      this.profileForm.displayName().value.set(displayName);
      await this.profileData.updateDisplayName(displayName);
      this.#savedDisplayName.set(displayName);
    });
  }
}

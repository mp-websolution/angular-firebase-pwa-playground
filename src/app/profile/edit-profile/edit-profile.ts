import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, maxLength, submit, validate } from '@angular/forms/signals';
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
  template: `
    <main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 class="text-3xl font-bold tracking-tight">Profile</h1>
      @if (profileData.loadFailed()) {
        <p role="alert" class="text-red-700">
          Your profile couldn't be loaded. Reload the page to try again.
        </p>
      } @else if (profileData.profile(); as profile) {
        <div class="flex items-center gap-4">
          @if (profile.avatarUrl) {
            <img
              alt="Your avatar"
              class="size-20 rounded-full object-cover"
              [src]="profile.avatarUrl"
            />
          } @else {
            <div class="size-20 rounded-full bg-slate-200"></div>
          }
          <div class="flex flex-col gap-1">
            <label class="flex flex-col gap-1">
              Avatar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-describedby="avatar-message"
                class="text-sm file:mr-3 file:rounded file:border file:border-slate-300 file:px-3 file:py-1"
                [attr.aria-invalid]="
                  avatarStatus() === 'wrong-type' || avatarStatus() === 'too-large'
                "
                [disabled]="avatarStatus() === 'uploading'"
                (change)="uploadAvatar($event)"
              />
            </label>
            <p id="avatar-message" aria-live="polite" class="text-sm text-red-700">
              @switch (avatarStatus()) {
                @case ('uploading') {
                  <span class="text-slate-600">Uploading…</span>
                }
                @case ('wrong-type') {
                  Choose a PNG, JPEG, WebP or GIF image.
                }
                @case ('too-large') {
                  Choose an image of at most 2 MB.
                }
                @case ('failed') {
                  Your avatar couldn't be uploaded. Check your connection and try again.
                }
              }
            </p>
          </div>
        </div>
        <form
          novalidate
          class="flex flex-col gap-4"
          (submit)="saveProfile(); $event.preventDefault()"
        >
          @let displayNameField = profileForm.displayName();
          <label class="flex flex-col gap-1">
            Display name
            <input
              type="text"
              autocomplete="nickname"
              aria-describedby="display-name-errors"
              class="rounded border border-slate-300 px-3 py-2"
              [attr.aria-invalid]="displayNameField.touched() && displayNameField.invalid()"
              [formField]="profileForm.displayName"
            />
          </label>
          <div id="display-name-errors">
            @if (displayNameField.touched()) {
              @for (error of displayNameField.errors(); track error.kind) {
                <p class="text-sm text-red-700">{{ error.message }}</p>
              }
            }
          </div>
          <button
            type="submit"
            class="rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            [disabled]="profileForm().submitting()"
          >
            Save
          </button>
        </form>
        <p role="status" class="text-slate-600">
          @if (profileData.waitingToSync()) {
            Saved on this device. It syncs to your account once you're online.
          } @else if (saved()) {
            Saved.
          }
        </p>
      } @else {
        <p class="text-slate-600">Loading your profile…</p>
      }
      <a routerLink="/" class="underline">Back to home</a>
    </main>
  `,
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
        return displayName.length < 2
          ? { kind: 'minLength', message: 'Use at least 2 characters.' }
          : undefined;
      });
      maxLength(path.displayName, 50, { message: 'Use at most 50 characters.' });
    },
  );

  readonly #savedDisplayName = signal<string | undefined>(undefined);
  /** Whether the form shows what was just saved, so "Saved." goes away once the user edits. */
  protected readonly saved = computed(
    () => this.#savedDisplayName() === this.profileForm.displayName().value(),
  );

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

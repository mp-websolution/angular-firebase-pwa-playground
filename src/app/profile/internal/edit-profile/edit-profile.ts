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
import { AuthSession } from '../../../auth/auth-session';
import { messageOf } from '../../../auth/auth-session-error';
import { ProfileData } from '../../profile-data';

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
  readonly #session = inject(AuthSession);

  readonly #brokenAvatarUrl = signal<string | null>(null);
  protected readonly avatarUrl = computed(() => {
    const url = this.#session.user()?.avatarUrl;
    return url === this.#brokenAvatarUrl() ? null : url;
  });

  protected showPlaceholderInsteadOf(brokenUrl: string): void {
    this.#brokenAvatarUrl.set(brokenUrl);
  }

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

  protected readonly signingOut = signal(false);
  protected readonly signOutError = signal('');

  protected async signOut(): Promise<void> {
    this.signOutError.set('');
    this.signingOut.set(true);
    try {
      await this.#session.signOut();
    } catch (error) {
      this.signOutError.set(messageOf(error));
      return;
    } finally {
      this.signingOut.set(false);
    }
  }

  async #updateDisplayName(): Promise<TreeValidationResult> {
    const displayName = this.#profileModel().displayName.trim();
    this.#showWhatGetsStoredAndFollowTheStoredNameAgain(displayName);
    await this.profileData.updateDisplayName(displayName);
    this.#savedDisplayName.set(displayName);
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

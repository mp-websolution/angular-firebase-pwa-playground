import { Component, input, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { messageOf } from './auth-session-error';
import { Credentials } from './credentials.model';

/** Email and password fields that run `action` on submit and show why it failed. */
@Component({
  selector: 'app-credentials-form',
  imports: [FormField],
  template: `
    <form
      novalidate
      class="flex flex-col gap-4"
      (submit)="submitCredentials(); $event.preventDefault()"
    >
      @let emailField = credentials.email();
      <label class="flex flex-col gap-1">
        Email
        <input
          type="email"
          autocomplete="email"
          aria-describedby="email-errors"
          class="rounded border border-slate-300 px-3 py-2"
          [attr.aria-invalid]="emailField.touched() && emailField.invalid()"
          [formField]="credentials.email"
        />
      </label>
      <div id="email-errors">
        @if (emailField.touched()) {
          @for (error of emailField.errors(); track error.kind) {
            <p class="text-sm text-red-700">{{ error.message }}</p>
          }
        }
      </div>
      @let passwordField = credentials.password();
      <label class="flex flex-col gap-1">
        Password
        <input
          type="password"
          aria-describedby="password-errors"
          class="rounded border border-slate-300 px-3 py-2"
          [attr.autocomplete]="passwordAutocomplete()"
          [attr.aria-invalid]="passwordField.touched() && passwordField.invalid()"
          [formField]="credentials.password"
        />
      </label>
      <div id="password-errors">
        @if (passwordField.touched()) {
          @for (error of passwordField.errors(); track error.kind) {
            <p class="text-sm text-red-700">{{ error.message }}</p>
          }
        }
      </div>
      @if (error(); as message) {
        <p role="alert" class="text-red-700">{{ message }}</p>
      }
      <button
        type="submit"
        class="rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        [disabled]="credentials().submitting()"
      >
        {{ submitLabel() }}
      </button>
    </form>
  `,
})
export class CredentialsForm {
  readonly submitLabel = input.required<string>();
  readonly passwordAutocomplete = input.required<'current-password' | 'new-password'>();
  readonly action = input.required<(credentials: Credentials) => Promise<void>>();

  protected readonly error = signal('');
  protected readonly credentials = form(
    signal<Credentials>({ email: '', password: '' }),
    (path) => {
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Enter your password.' });
    },
  );

  protected submitCredentials(): void {
    submit(this.credentials, async () => {
      this.error.set('');
      try {
        await this.action()(this.credentials().value());
      } catch (error) {
        this.error.set(messageOf(error));
      }
    });
  }
}

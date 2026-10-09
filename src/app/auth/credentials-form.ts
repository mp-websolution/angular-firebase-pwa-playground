import { Component, input, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { messageOf } from './auth-session-error';
import { Credentials } from './credentials.model';

@Component({
  selector: 'app-credentials-form',
  imports: [FormField],
  templateUrl: './credentials-form.html',
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

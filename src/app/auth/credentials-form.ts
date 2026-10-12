import { Component, input, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  ValidationError,
  email,
  form,
  required,
} from '@angular/forms/signals';
import { userFixable, messageOf } from './auth-session-error';
import { Credentials } from './credentials.model';

@Component({
  selector: 'app-credentials-form',
  imports: [FormField, FormRoot],
  templateUrl: './credentials-form.html',
})
export class CredentialsForm {
  readonly submitLabel = input.required<string>();
  readonly passwordAutocomplete = input.required<'current-password' | 'new-password'>();
  readonly action = input.required<(credentials: Credentials) => Promise<void>>();

  protected readonly unexpectedError = signal('');
  readonly #credentialsModel = signal<Credentials>({ email: '', password: '' });
  protected readonly credentialsForm = form(
    this.#credentialsModel,
    (path) => {
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Enter your password.' });
    },
    {
      submission: {
        action: async (form): Promise<ValidationError | void> => {
          this.unexpectedError.set('');
          try {
            await this.action()(form().value());
          } catch (error) {
            if (userFixable(error)) {
              return { kind: 'auth', message: error.message };
            }
            this.unexpectedError.set(messageOf(error));
          }
        },
      },
    },
  );
}

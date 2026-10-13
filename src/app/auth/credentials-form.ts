import { Component, Injector, afterNextRender, inject, input, signal } from '@angular/core';
import {
  FormField,
  FieldTree,
  FormRoot,
  TreeValidationResult,
  email,
  form,
  required,
} from '@angular/forms/signals';
import { AuthFailure } from './auth-failure.model';
import { userFixable, messageOf } from './auth-session-error';
import { Credentials } from './credentials.model';

const fieldToFix: Partial<Record<AuthFailure, keyof Credentials>> = {
  'invalid-email': 'email',
  'email-in-use': 'email',
  'weak-password': 'password',
};

@Component({
  selector: 'app-credentials-form',
  imports: [FormField, FormRoot],
  templateUrl: './credentials-form.html',
})
export class CredentialsForm {
  readonly submitLabel = input.required<string>();
  readonly passwordAutocomplete = input.required<'current-password' | 'new-password'>();
  readonly authenticate = input.required<(credentials: Credentials) => Promise<void>>();

  readonly #injector = inject(Injector);

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
        action: async (form): Promise<TreeValidationResult> => {
          this.unexpectedError.set('');
          try {
            await this.authenticate()(this.#credentialsModel());
          } catch (error) {
            if (userFixable(error)) {
              const field = fieldToFix[error.reason];
              if (field) {
                this.#focusOnceItsErrorShows(form[field]);
              }
              return {
                kind: 'auth',
                message: error.message,
                fieldTree: field ? form[field] : form,
              };
            }
            this.unexpectedError.set(messageOf(error));
          }
        },
      },
    },
  );

  #focusOnceItsErrorShows(field: FieldTree<string>) {
    afterNextRender(() => field().focusBoundControl(), { injector: this.#injector });
  }
}

import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../auth-session';
import { messageOf } from '../auth-session-error';
import { CredentialsForm } from '../credentials-form';
import { Credentials } from '../credentials.model';
import { injectReturnUrl } from '../return-url';

@Component({
  selector: 'app-sign-in',
  imports: [CredentialsForm, RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 class="text-3xl font-bold tracking-tight">Sign in</h1>
      <app-credentials-form
        submitLabel="Sign in"
        passwordAutocomplete="current-password"
        [action]="signIn"
      />
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="rounded border border-slate-300 px-4 py-2 font-medium disabled:opacity-50"
          [disabled]="googlePending()"
          (click)="signInWithGoogle()"
        >
          Sign in with Google
        </button>
        @if (googleError(); as message) {
          <p role="alert" class="text-red-700">{{ message }}</p>
        }
      </div>
      <p class="text-slate-600">
        No account yet?
        <a routerLink="/sign-up" queryParamsHandling="preserve" class="underline">Create one</a>
      </p>
    </main>
  `,
})
export class SignIn {
  readonly #session = inject(AuthSession);
  readonly #router = inject(Router);
  readonly #returnUrl = injectReturnUrl();

  protected readonly googlePending = signal(false);
  protected readonly googleError = signal('');

  protected readonly signIn = async (credentials: Credentials) => {
    await this.#session.signInWithEmail(credentials);
    await this.#router.navigateByUrl(this.#returnUrl);
  };

  protected async signInWithGoogle(): Promise<void> {
    this.googleError.set('');
    this.googlePending.set(true);
    try {
      await this.#session.signInWithGoogle();
    } catch (error) {
      this.googleError.set(messageOf(error));
      return;
    } finally {
      this.googlePending.set(false);
    }
    await this.#router.navigateByUrl(this.#returnUrl);
  }
}

import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../auth/auth-session';
import { messageOf } from '../auth/auth-session-error';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-6">
      <h1 class="text-3xl font-bold tracking-tight">Angular Firebase PWA Playground</h1>
      @if (session.user(); as user) {
        <p class="text-slate-600">Signed in as {{ user.email ?? user.displayName }}</p>
      }
      <div class="flex items-center gap-4">
        <a routerLink="/profile" class="underline">Profile</a>
        <button
          type="button"
          class="rounded border border-slate-300 px-4 py-2 font-medium disabled:opacity-50"
          [disabled]="signingOut()"
          (click)="signOut()"
        >
          Sign out
        </button>
      </div>
      @if (error(); as message) {
        <p role="alert" class="text-red-700">{{ message }}</p>
      }
    </main>
  `,
})
export class Home {
  protected readonly session = inject(AuthSession);
  readonly #router = inject(Router);

  protected readonly signingOut = signal(false);
  protected readonly error = signal('');

  protected async signOut(): Promise<void> {
    this.error.set('');
    this.signingOut.set(true);
    try {
      await this.session.signOut();
    } catch (error) {
      this.error.set(messageOf(error));
      return;
    } finally {
      this.signingOut.set(false);
    }
    await this.#router.navigateByUrl('/sign-in');
  }
}

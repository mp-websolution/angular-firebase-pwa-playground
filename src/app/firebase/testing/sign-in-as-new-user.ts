import { TestBed } from '@angular/core/testing';
import { AuthSession } from '../../auth/auth-session';

/**
 * Signs a new user up through `AuthSession`, as the guards make sure before a page with Live data
 * loads. Resolves to the user's uid.
 */
export async function signInAsNewUser(): Promise<string> {
  const session = TestBed.inject(AuthSession);
  await session.signUpWithEmail({
    email: `user-${crypto.randomUUID()}@example.com`,
    password: 'correct-horse',
  });
  return session.user()!.uid;
}

import { InjectionToken } from '@angular/core';
import { SignInMethods, signInMethods } from '../../app-identity/sign-in-methods';

/** The sign-in methods `/sign-in` offers, in page order. */
export const SIGN_IN_METHODS = new InjectionToken<SignInMethods>('SIGN_IN_METHODS', {
  providedIn: 'root',
  factory: () => signInMethods,
});

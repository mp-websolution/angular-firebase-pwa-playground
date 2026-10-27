import { InjectionToken, inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { SignInMethods, signInMethods } from '../../../app-identity/sign-in-methods';

/** The sign-in methods `/sign-in` offers, in page order. A token so tests can pick their own list. */
export const SIGN_IN_METHODS = new InjectionToken<SignInMethods>('SIGN_IN_METHODS', {
  providedIn: 'root',
  factory: () => signInMethods,
});

export const passwordListedGuard: CanMatchFn = () => inject(SIGN_IN_METHODS).includes('password');

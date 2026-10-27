import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { SIGN_IN_METHODS } from '../sign-in-methods-token';

export const passwordListedGuard: CanMatchFn = () => inject(SIGN_IN_METHODS).includes('password');

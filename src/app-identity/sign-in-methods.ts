export type SignInMethod = 'password' | 'google';

export type SignInMethods = readonly [SignInMethod, ...SignInMethod[]];

// Turn on exactly these providers in the Firebase console (Baseline manual, "3. Authentication").
export const signInMethods: SignInMethods = ['password', 'google'];

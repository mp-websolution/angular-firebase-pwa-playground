import { TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { FIREBASE_AUTH, provideFirebase } from '../firebase/provide-firebase';
import { RELOAD_PAGE } from '../browser/reload-page';
import { AuthSession } from './auth-session';
import { enablePersistentCacheInJsdom } from '../firebase/testing/persistent-cache-in-jsdom';
import { signOutForTheNextTest } from '../firebase/testing/tear-down-firebase';

vi.mock('firebase/auth', async (importOriginal) => {
  const sdk = await importOriginal<typeof import('firebase/auth')>();
  return { ...sdk, signInWithPopup: vi.fn(sdk.signInWithPopup) };
});

function newEmail() {
  return `session-${crypto.randomUUID()}@example.com`;
}

function signOutAsAnotherTabWould() {
  return signOut(TestBed.inject(FIREBASE_AUTH));
}

function closeTheGooglePopupBeforeFinishing() {
  vi.mocked(signInWithPopup).mockRejectedValueOnce(
    new FirebaseError('auth/popup-closed-by-user', 'Firebase: Error (auth/popup-closed-by-user).'),
  );
}

function failToDeleteFirestoreCache(
  because: Error = new DOMException('Disk is busy', 'UnknownError'),
) {
  const deleteDatabase = indexedDB.deleteDatabase.bind(indexedDB);
  const spy = vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name) => {
    if (name.startsWith('firestore/')) {
      throw because;
    }
    return deleteDatabase(name);
  });
  onTestFinished(() => spy.mockRestore());
}

describe('AuthSession against the Auth emulator', () => {
  const reloadPage = vi.fn<() => void>();

  beforeEach(() => {
    reloadPage.mockReset();
    enablePersistentCacheInJsdom();
    TestBed.configureTestingModule({
      providers: [
        provideFirebase(environment.firebase),
        { provide: RELOAD_PAGE, useValue: reloadPage },
      ],
    });
  });

  afterEach(async () => {
    await signOutForTheNextTest();
    vi.unstubAllEnvs();
  });

  it('resolves to signed out when nobody signed in before', async () => {
    const session = TestBed.inject(AuthSession);

    await vi.waitFor(() => expect(session.resolved()).toBe(true));

    expect(session.user()).toBeNull();
  });

  it('signs up with email and password, which signs the new user in', async () => {
    const session = TestBed.inject(AuthSession);
    const email = newEmail();

    await session.signUpWithEmail({ email, password: 'correct-horse' });

    expect(session.user()).toMatchObject({ email });
  });

  it('signs in an existing user with email and password', async () => {
    const session = TestBed.inject(AuthSession);
    const email = newEmail();
    await session.signUpWithEmail({ email, password: 'correct-horse' });
    await signOut(TestBed.inject(FIREBASE_AUTH));

    await session.signInWithEmail({ email, password: 'correct-horse' });

    expect(session.user()).toMatchObject({ email });
  });

  it('rejects a wrong password', async () => {
    const session = TestBed.inject(AuthSession);
    const email = newEmail();
    await session.signUpWithEmail({ email, password: 'correct-horse' });
    await signOut(TestBed.inject(FIREBASE_AUTH));

    await expect(session.signInWithEmail({ email, password: 'wrong-horse' })).rejects.toMatchObject(
      {
        reason: 'invalid-credential',
        message: 'Wrong email or password.',
      },
    );
  });

  it('rejects an email no account uses just like a wrong password, so it reveals no accounts', async () => {
    await expect(
      TestBed.inject(AuthSession).signInWithEmail({ email: newEmail(), password: 'correct-horse' }),
    ).rejects.toMatchObject({ reason: 'invalid-credential' });
  });

  it('rejects signing up with an email that is already in use', async () => {
    const session = TestBed.inject(AuthSession);
    const email = newEmail();
    await session.signUpWithEmail({ email, password: 'correct-horse' });
    await signOut(TestBed.inject(FIREBASE_AUTH));

    await expect(
      session.signUpWithEmail({ email, password: 'correct-horse' }),
    ).rejects.toMatchObject({
      reason: 'email-in-use',
    });
  });

  it('rejects signing up with a weak password', async () => {
    await expect(
      TestBed.inject(AuthSession).signUpWithEmail({ email: newEmail(), password: '123' }),
    ).rejects.toMatchObject({ reason: 'weak-password' });
  });

  it('signs out, then reloads the page', async () => {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({ email: newEmail(), password: 'correct-horse' });

    await session.signOut();

    expect(session.user()).toBeNull();
    expect(reloadPage).toHaveBeenCalled();
  });

  it('reloads the page when the user is signed out elsewhere, e.g. in another tab', async () => {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({ email: newEmail(), password: 'correct-horse' });

    await signOutAsAnotherTabWould();

    expect(reloadPage).toHaveBeenCalled();
  });

  it('keeps the user signed in when sign-out cannot delete the cache', async () => {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({ email: newEmail(), password: 'correct-horse' });
    failToDeleteFirestoreCache();

    await expect(session.signOut()).rejects.toMatchObject({ reason: 'unknown' });

    expect(session.user()).not.toBeNull();
    expect(TestBed.inject(FIREBASE_AUTH).currentUser).not.toBeNull();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('asks to close the other tabs when one holds on to the cache', async () => {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({ email: newEmail(), password: 'correct-horse' });
    failToDeleteFirestoreCache(new FirebaseError('failed-precondition', 'Cache in use.'));

    await expect(session.signOut()).rejects.toMatchObject({ reason: 'other-tabs-open' });

    expect(session.user()).not.toBeNull();
  });

  it('signs in with Google in a popup', async () => {
    closeTheGooglePopupBeforeFinishing();

    await expect(TestBed.inject(AuthSession).signInWithGoogle()).rejects.toMatchObject({
      reason: 'popup-closed',
    });

    expect(signInWithPopup).toHaveBeenCalledWith(
      TestBed.inject(FIREBASE_AUTH),
      expect.any(GoogleAuthProvider),
    );
  });

  it('does not reload the page when a user signs in', async () => {
    const session = TestBed.inject(AuthSession);
    await vi.waitFor(() => expect(session.resolved()).toBe(true));

    await session.signUpWithEmail({ email: newEmail(), password: 'correct-horse' });

    expect(reloadPage).not.toHaveBeenCalled();
  });
});

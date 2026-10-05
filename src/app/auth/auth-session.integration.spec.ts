// jsdom has no IndexedDB; Firestore's persistent cache needs one.
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { signOut } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { FIREBASE_AUTH, provideFirebase } from '../firebase/provide-firebase';
import { RELOAD_PAGE } from '../browser/reload-page';
import { AuthSession } from './auth-session';

function newEmail() {
  return `session-${crypto.randomUUID()}@example.com`;
}

describe('AuthSession against the Auth emulator', () => {
  const reloadPage = vi.fn<() => void>();

  beforeEach(() => {
    reloadPage.mockReset();
    // Tests load Firestore's Node build, which only uses IndexedDB with its own test switch on.
    vi.stubEnv('USE_MOCK_PERSISTENCE', 'YES');
    TestBed.configureTestingModule({
      providers: [
        provideFirebase(environment.firebase),
        { provide: RELOAD_PAGE, useValue: reloadPage },
      ],
    });
  });

  afterEach(async () => {
    // Auth keeps the signed-in user across app instances; don't let it leak into the next test.
    await signOut(TestBed.inject(FIREBASE_AUTH));
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

  it('rejects an email no account uses just like a wrong password', async () => {
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

    // What this tab's Auth sees when another tab signs out.
    await signOut(TestBed.inject(FIREBASE_AUTH));

    expect(reloadPage).toHaveBeenCalled();
  });

  it('does not reload the page when a user signs in', async () => {
    const session = TestBed.inject(AuthSession);
    await vi.waitFor(() => expect(session.resolved()).toBe(true));

    await session.signUpWithEmail({ email: newEmail(), password: 'correct-horse' });

    expect(reloadPage).not.toHaveBeenCalled();
  });
});

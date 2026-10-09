import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { environment } from '../../../environments/environment';

/**
 * `beforeAll` for specs that read or write the app's Firestore data through the emulator, e.g.
 * past the rules or to test them. Passes no rules: the emulator already runs `firestore.rules`,
 * the file that gets deployed. Finds the emulator through `FIRESTORE_EMULATOR_HOST`, which
 * `emulators:exec` sets. Call `cleanup()` on the result in `afterAll`.
 */
export function testEnvironmentWithDeployedFirestoreRules(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: environment.firebase.options.projectId,
    firestore: {},
  });
}

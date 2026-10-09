import { emulators } from '../../firebase.json';
import type { Environment } from './environment.model';

// Development and tests: the `demo-playground` project only exists in the emulators.
export const environment: Environment = {
  firebase: {
    options: {
      apiKey: 'demo-api-key',
      authDomain: 'demo-playground.firebaseapp.com',
      projectId: 'demo-playground',
      storageBucket: 'demo-playground.appspot.com',
    },
    emulators: {
      host: '127.0.0.1',
      authPort: emulators.auth.port,
      firestorePort: emulators.firestore.port,
      storagePort: emulators.storage.port,
    },
  },
};

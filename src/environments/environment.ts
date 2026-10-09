import type { Environment } from './environment.model';

// Not a secret: access is controlled by Auth and the security rules.
export const environment: Environment = {
  firebase: {
    options: {
      apiKey: 'REPLACE_ME',
      authDomain: 'REPLACE_ME.firebaseapp.com',
      projectId: 'REPLACE_ME',
      storageBucket: 'REPLACE_ME.firebasestorage.app',
      messagingSenderId: 'REPLACE_ME',
      appId: 'REPLACE_ME',
    },
  },
};

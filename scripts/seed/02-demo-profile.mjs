// The demo user's profile, so the profile page shows a display name straight away.

import { demoUser } from './01-demo-user.mjs';

export default async function seed({ projectId }) {
  const { uid, displayName } = demoUser;
  // The Firestore emulator accepts `Bearer owner` as admin credentials, which skips the rules.
  const response = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/profiles/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields: { displayName: { stringValue: displayName } } }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Creating the demo profile failed: ${response.status} ${await response.text()}`,
    );
  }
}

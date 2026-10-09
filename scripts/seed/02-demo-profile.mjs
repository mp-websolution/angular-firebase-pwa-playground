import { demoUser } from './01-demo-user.mjs';

export default async function seed({ projectId }) {
  const response = await writeProfileAsFirestoreEmulatorAdminSkippingTheRules(projectId, demoUser);
  if (!response.ok) {
    throw new Error(
      `Creating the demo profile failed: ${response.status} ${await response.text()}`,
    );
  }
}

function writeProfileAsFirestoreEmulatorAdminSkippingTheRules(projectId, { uid, displayName }) {
  return fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/profiles/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields: { displayName: { stringValue: displayName } } }),
    },
  );
}

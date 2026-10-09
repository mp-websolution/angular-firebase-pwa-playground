// Test credentials for the local emulators only; they never reach a real Firebase project.
export const demoUser = {
  uid: 'demo-user',
  email: 'demo@example.com',
  password: 'demo-password',
  displayName: 'Demo User',
};

export default async function seed({ projectId }) {
  const response = await createAccountWithItsOwnUidAsAuthEmulatorAdmin(projectId, demoUser);
  if (!response.ok) {
    throw new Error(`Creating the demo user failed: ${response.status} ${await response.text()}`);
  }
}

function createAccountWithItsOwnUidAsAuthEmulatorAdmin(
  projectId,
  { uid, email, password, displayName },
) {
  return fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: uid, email, password, displayName }),
    },
  );
}

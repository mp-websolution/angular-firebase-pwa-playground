import { demoUser } from './01-demo-user.mjs';

const notes = [
  { id: 'welcome', text: 'Welcome to the notes Prototype. Edit or delete me.', minutesAgo: 1 },
  { id: 'groceries', text: 'Buy milk, eggs and coffee', minutesAgo: 60 },
  { id: 'idea', text: 'Try the next Angular release here first', minutesAgo: 24 * 60 },
];

export default async function seed({ projectId }) {
  for (const note of notes) {
    const response = await writeNoteAsFirestoreEmulatorAdminSkippingTheRules(projectId, note);
    if (!response.ok) {
      throw new Error(
        `Creating demo note "${note.id}" failed: ${response.status} ${await response.text()}`,
      );
    }
  }
}

function writeNoteAsFirestoreEmulatorAdminSkippingTheRules(projectId, { id, text, minutesAgo }) {
  const createdAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/${demoUser.uid}/notes/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({
        fields: { text: { stringValue: text }, createdAt: { timestampValue: createdAt } },
      }),
    },
  );
}

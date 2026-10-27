import { demoUser } from './01-demo-user.mjs';

const someoneElsesUid = 'demo-someone-else';

const notes = [
  {
    id: 'welcome',
    text: 'Welcome to the notes board. Sign in as the demo user to edit or delete me.',
    authorUid: demoUser.uid,
    minutesAgo: 1,
  },
  {
    id: 'groceries',
    text: 'Buy milk, eggs and coffee',
    authorUid: demoUser.uid,
    minutesAgo: 60,
  },
  {
    id: 'someone-elses',
    text: "Someone else's note: everyone reads it, only its author changes it",
    authorUid: someoneElsesUid,
    minutesAgo: 2 * 60,
  },
  {
    id: 'idea',
    text: 'Try the next Angular release here first',
    authorUid: demoUser.uid,
    minutesAgo: 24 * 60,
  },
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

function writeNoteAsFirestoreEmulatorAdminSkippingTheRules(
  projectId,
  { id, text, authorUid, minutesAgo },
) {
  const createdAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/notes/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({
        fields: {
          text: { stringValue: text },
          authorUid: { stringValue: authorUid },
          createdAt: { timestampValue: createdAt },
        },
      }),
    },
  );
}

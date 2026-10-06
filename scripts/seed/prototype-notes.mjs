// Prototype: notes (src/app/notes). Sample notes for the demo user, so the notes page isn't empty.
// Delete this file together with the Prototype.

import { demoUser } from './01-demo-user.mjs';

const notes = [
  { id: 'welcome', text: 'Welcome to the notes Prototype. Edit or delete me.', minutesAgo: 1 },
  { id: 'groceries', text: 'Buy milk, eggs and coffee', minutesAgo: 60 },
  { id: 'idea', text: 'Try the next Angular release here first', minutesAgo: 24 * 60 },
];

export default async function seed({ projectId }) {
  for (const { id, text, minutesAgo } of notes) {
    const createdAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
    // The Firestore emulator accepts `Bearer owner` as admin credentials, which skips the rules.
    const response = await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/${demoUser.uid}/notes/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({
          fields: { text: { stringValue: text }, createdAt: { timestampValue: createdAt } },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Creating demo note "${id}" failed: ${response.status} ${await response.text()}`,
      );
    }
  }
}

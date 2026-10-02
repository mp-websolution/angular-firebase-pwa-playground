// Populates the emulators with demo data. `npm start` runs it inside `firebase emulators:exec`.
//
// Every module in `scripts/seed/` is a seeder: its default export is an async function that
// receives `{ projectId }` and writes its data to the emulators. Seeders run in filename order,
// so a Prototype adds or removes its demo data by adding or deleting one file.

import { readdir } from 'node:fs/promises';

const emulatorHosts = [
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
];
const missing = emulatorHosts.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Refusing to seed: ${missing.join(', ')} not set. Run inside the emulators.`);
  process.exit(1);
}
const loopback = ['127.0.0.1', 'localhost', '[::1]'];
const remote = emulatorHosts.filter((name) => {
  const url = `http://${process.env[name]}`;
  return !URL.canParse(url) || !loopback.includes(new URL(url).hostname);
});
if (remote.length > 0) {
  console.error(`Refusing to seed: ${remote.join(', ')} not a host on this machine.`);
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT;
if (!projectId?.startsWith('demo-')) {
  console.error(`Refusing to seed project "${projectId}": only demo-* projects are seeded.`);
  process.exit(1);
}

const seedDir = new URL('./seed/', import.meta.url);
const seeders = (await readdir(seedDir)).filter((file) => file.endsWith('.mjs')).sort();

for (const file of seeders) {
  const { default: seed } = await import(new URL(file, seedDir).href);
  await seed({ projectId });
  console.log(`Seeded ${file}`);
}
console.log(`Seeding done (${seeders.length} seeders).`);

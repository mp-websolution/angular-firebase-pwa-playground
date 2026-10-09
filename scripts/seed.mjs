import { readdir } from 'node:fs/promises';

const emulatorHosts = [
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
];
const loopbackHostnames = ['127.0.0.1', 'localhost', '[::1]'];
const seedDir = new URL('./seed/', import.meta.url);

refuseUnlessEveryEmulatorHostIsSet();
refuseUnlessEveryEmulatorRunsOnThisMachine();
await runEverySeederInFilenameOrder(demoProjectIdOrRefuse());

function refuseUnlessEveryEmulatorHostIsSet() {
  const missing = emulatorHosts.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    refuse(`Refusing to seed: ${missing.join(', ')} not set. Run inside the emulators.`);
  }
}

function refuseUnlessEveryEmulatorRunsOnThisMachine() {
  const remote = emulatorHosts.filter((name) => !isOnThisMachine(process.env[name]));
  if (remote.length > 0) {
    refuse(`Refusing to seed: ${remote.join(', ')} not a host on this machine.`);
  }
}

function isOnThisMachine(host) {
  const url = `http://${host}`;
  return URL.canParse(url) && loopbackHostnames.includes(new URL(url).hostname);
}

function demoProjectIdOrRefuse() {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId?.startsWith('demo-')) {
    refuse(`Refusing to seed project "${projectId}": only demo-* projects are seeded.`);
  }
  return projectId;
}

function refuse(message) {
  console.error(message);
  process.exit(1);
}

async function runEverySeederInFilenameOrder(projectId) {
  const seeders = (await readdir(seedDir)).filter((file) => file.endsWith('.mjs')).sort();
  for (const file of seeders) {
    const { default: seed } = await import(new URL(file, seedDir).href);
    await seed({ projectId });
    console.log(`Seeded ${file}`);
  }
  console.log(`Seeding done (${seeders.length} seeders).`);
}

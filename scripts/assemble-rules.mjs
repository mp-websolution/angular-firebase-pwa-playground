import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const services = ['firestore', 'storage'];
const marker = '// Feature rules: inserted here by scripts/assemble-rules.mjs';
const featuresFolder = 'src/app/features';
const featureName = /^[a-z]+(-[a-z]+)*$/;
const outputFolder = 'assembled-rules';

const features = await featuresInNameOrder();
const inputs = [];
for (const service of services) {
  const source = await sourceWithOneMarkerOrRefuse(service);
  inputs.push({ service, source, fragments: await fragmentsOrRefuse(features, service) });
}
await mkdir(outputFolder, { recursive: true });
for (const { service, source, fragments } of inputs) {
  await writeFile(`${outputFolder}/${service}.rules`, withFragmentsAtMarker(source, fragments));
  const names = fragments.map(({ feature }) => feature);
  console.log(`Assembled ${outputFolder}/${service}.rules: Baseline + [${names.join(', ')}].`);
}

async function sourceWithOneMarkerOrRefuse(service) {
  const source = await readFile(`${service}.rules`, 'utf8');
  const markerLines = source.split('\n').filter((line) => line.trim() === marker);
  if (markerLines.length !== 1) {
    refuse(`${service}.rules needs exactly one line "${marker}".`);
  }
  return source;
}

async function featuresInNameOrder() {
  const entries = await readdir(featuresFolder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function fragmentsOrRefuse(features, service) {
  const fragments = [];
  for (const feature of features) {
    const folder = `${featuresFolder}/${feature}`;
    const files = await readdir(folder);
    const fragment = `${feature}.${service}.rules`;
    const misnamed = files.find((file) => file.endsWith(`.${service}.rules`) && file !== fragment);
    if (misnamed) {
      refuse(`${folder}/${misnamed} is not named after its Feature: rename it to ${fragment}.`);
    }
    if (!files.includes(fragment)) {
      continue;
    }
    if (!featureName.test(feature)) {
      refuse(
        `${folder}/${fragment} belongs to Feature "${feature}", but a Feature name has only lowercase letters and hyphens.`,
      );
    }
    if (!files.includes(`${feature}.routes.ts`)) {
      refuse(`${folder}/${fragment} has no Feature: ${folder}/${feature}.routes.ts is missing.`);
    }
    fragments.push({ feature, rules: await readFile(`${folder}/${fragment}`, 'utf8') });
  }
  return fragments;
}

function refuse(message) {
  console.error(message);
  process.exit(1);
}

function withFragmentsAtMarker(source, fragments) {
  return source
    .split('\n')
    .flatMap((line) => (line.trim() === marker ? fragmentLines(fragments, indentOf(line)) : [line]))
    .join('\n');
}

function indentOf(line) {
  return line.slice(0, line.length - line.trimStart().length);
}

function fragmentLines(fragments, indent) {
  const blocks = fragments.map(({ feature, rules }) => [
    `// ---- Feature: ${feature} (${featuresFolder}/${feature}) ----`,
    ...rules.trimEnd().split('\n'),
    `// ---- End of Feature: ${feature} ----`,
  ]);
  return blocks
    .flatMap((block, index) => (index === 0 ? block : ['', ...block]))
    .map((line) => (line === '' ? line : indent + line));
}

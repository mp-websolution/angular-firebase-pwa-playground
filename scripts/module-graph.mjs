import { execFileSync } from 'node:child_process';
import { getProjectData } from '@softarc/sheriff-core';

const entryFiles = ['src/main.ts', ...trackedSpecFiles()];
const edges = new Map();

for (const entryFile of entryFiles) {
  const project = getProjectData(entryFile, process.cwd());
  for (const [file, entry] of Object.entries(project)) {
    for (const imported of entry.imports) {
      recordEdge(tagOf(entry), tagOf(project[imported]), file);
    }
  }
}

printEdgesSortedByModule();

function trackedSpecFiles() {
  return execFileSync('git', ['ls-files', 'src/**/*.spec.ts'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function tagOf(entry) {
  return entry.tags.join(',');
}

function recordEdge(from, to, file) {
  if (from === to) return;
  const key = `${from} -> ${to}`;
  const edge = edges.get(key) ?? { production: new Set(), spec: new Set() };
  (file.endsWith('.spec.ts') ? edge.spec : edge.production).add(file);
  edges.set(key, edge);
}

function printEdgesSortedByModule() {
  for (const [key, { production, spec }] of [...edges].sort(([a], [b]) => a.localeCompare(b))) {
    const files = production.size + spec.size;
    const onlyFromSpecs = production.size === 0 ? '  (specs only)' : '';
    console.log(`${key}  ${files} ${files === 1 ? 'file' : 'files'}${onlyFromSpecs}`);
  }
}

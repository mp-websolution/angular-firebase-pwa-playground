import { noDependencies, SheriffConfig } from '@softarc/sheriff-core';

const isSpec = (filePath: string) => filePath.endsWith('.spec.ts');
const isAppRoutes = (filePath: string) => /[\\/]src[\\/]app[\\/]app\.routes\.ts$/.test(filePath);

export const config: SheriffConfig = {
  entryFile: 'src/main.ts',
  enableBarrelLess: true,
  // An index.ts anywhere would otherwise silently become an untagged module.
  autoTagging: false,
  modules: {
    // A new Baseline folder needs an entry here and in the `feature` rule below.
    'src/environments': 'env',
    'src/app-identity': 'app-identity',
    'src/app/firebase': 'baseline:firebase',
    'src/app/browser': 'baseline:browser',
    'src/app/auth': 'baseline:auth',
    'src/app/live-data': 'baseline:live-data',
    'src/app/profile': 'baseline:profile',
    'src/app/pwa': 'baseline:pwa',
    'src/app/home': 'baseline:home',
    'src/app/testing': 'testing',
    'src/app/features': 'feature-route-list',
    'src/app/features/<feature>': 'feature',
  },
  depRules: {
    root: [
      'env',
      'baseline:*',
      ({ to, fromFilePath }) => to === 'feature-route-list' && isAppRoutes(fromFilePath),
    ],
    env: 'baseline:firebase',
    'app-identity': noDependencies,
    'baseline:firebase': noDependencies,
    'baseline:browser': noDependencies,
    'baseline:auth': ['baseline:firebase', 'baseline:browser'],
    'baseline:live-data': ['baseline:auth', 'baseline:firebase'],
    'baseline:profile': ['baseline:auth', 'baseline:live-data', 'baseline:firebase'],
    'baseline:pwa': 'baseline:browser',
    'baseline:home': ['baseline:auth', 'feature-route-list', 'app-identity'],
    'feature-route-list': 'feature',
    // Not home: it imports the Feature route list, so Feature → home would close a cycle.
    feature: [
      'baseline:firebase',
      'baseline:browser',
      'baseline:auth',
      'baseline:live-data',
      'baseline:profile',
      'baseline:pwa',
      'app-identity',
    ],
    testing: ['root', 'env', 'baseline:*'],
    '*': ({ to, fromFilePath }) =>
      isSpec(fromFilePath) &&
      (to === 'testing' || to === 'env' || to === 'app-identity' || to.startsWith('baseline:')),
  },
};

// "Build" the app: copy app/ into dist/ and stamp it with version info.
// In the SIT pipeline APP_VERSION is the git tag (e.g. sit_1.0.0), so the
// tests can check that SIT is really running the version we just tagged.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = join(root, 'app');
const out = join(root, 'dist');

const info = {
  version: process.env.APP_VERSION || 'local-dev',
  commit: process.env.GITHUB_SHA || 'local',
  builtAt: new Date().toISOString(),
};

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
writeFileSync(join(out, 'version.json'), JSON.stringify(info, null, 2) + '\n');

console.log(`Built app/ -> dist/ (version ${info.version})`);

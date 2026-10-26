import { mkdir, rm, cp, access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_ROOT = path.join(ROOT, 'dist');
const DIST_CHROME = path.join(DIST_ROOT, 'chrome');

const FILES_TO_COPY = [
  'manifest.json',
  'background.js',
  'content.js',
  'index.html',
  'popup.css',
  'report.html',
  'report.js',
  'logo.svg'
];

const DIRS_TO_COPY = [
  'popup',
  'background',
  'icons',
  'vendor',
  'fonts'
];

const args = new Set(process.argv.slice(2));

if (args.has('--clean')) {
  assertBuildPath(DIST_ROOT);
  await rm(DIST_ROOT, { recursive: true, force: true });
  process.exit(0);
}

assertBuildPath(DIST_CHROME);
await rm(DIST_CHROME, { recursive: true, force: true });
await mkdir(DIST_CHROME, { recursive: true });

for (const relativePath of FILES_TO_COPY) {
  const src = path.join(ROOT, relativePath);
  if (!(await exists(src))) continue;
  const dest = path.join(DIST_CHROME, relativePath);
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(src, dest, { force: true });
}

for (const relativePath of DIRS_TO_COPY) {
  const src = path.join(ROOT, relativePath);
  if (!(await exists(src))) continue;
  const dest = path.join(DIST_CHROME, relativePath);
  await cp(src, dest, { recursive: true, force: true });
}

const manifestPath = path.join(DIST_CHROME, 'manifest.json');
const proxyUrl = process.env.PRIVATESEO_AI_PROXY_URL || '';
if (proxyUrl && new URL(proxyUrl).protocol !== 'https:') {
  throw new Error('PRIVATESEO_AI_PROXY_URL must use HTTPS');
}
await writeFile(path.join(DIST_CHROME, 'background', 'config.js'), `export const AI_PROXY_URL = ${JSON.stringify(proxyUrl)};\n`);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.name = 'PrivateSEO';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Chrome build ready: ${path.relative(ROOT, DIST_CHROME)}`);

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function assertBuildPath(target) {
  const relative = path.relative(ROOT, path.resolve(target));
  if (relative !== 'dist' && relative !== path.join('dist', 'chrome')) {
    throw new Error('Refusing to remove a path outside the build output');
  }
}

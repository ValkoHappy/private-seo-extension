import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'dist', 'chrome');
const releases = path.join(root, 'release');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
const slug = (value) =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-');
const destination = path.join(
    releases,
    `${slug(manifest.name)}-chrome-${slug(manifest.version)}.zip`
);
const entries = {};

async function collect(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, item.name);
        if (item.isSymbolicLink())
            throw new Error(`Symlinks are not allowed in an extension archive: ${item.name}`);
        if (item.isDirectory()) await collect(fullPath);
        else
            entries[path.relative(source, fullPath).split(path.sep).join('/')] = new Uint8Array(
                await readFile(fullPath)
            );
    }
}

await collect(source);
await mkdir(releases, { recursive: true });
await writeFile(destination, zipSync(entries, { level: 6 }));
console.log(`Chrome archive ready: ${path.relative(root, destination)}`);

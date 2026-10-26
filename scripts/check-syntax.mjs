import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'acorn';

async function check(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (
            ['vendor', 'dist', 'release', 'node_modules'].includes(entry.name) ||
            entry.name.startsWith('.')
        )
            continue;
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await check(path);
        else if (/\.m?js$/.test(entry.name)) {
            parse(await readFile(path, 'utf8'), {
                ecmaVersion: 'latest',
                sourceType:
                    path.includes('/background/') ||
                    /\.mjs$/.test(path) ||
                    path === './background.js'
                        ? 'module'
                        : 'script'
            });
        }
    }
}
await check('.');
console.log('JavaScript syntax checks passed');

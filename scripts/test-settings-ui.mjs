import fs from 'node:fs/promises';

const [indexHtml, shellJs] = await Promise.all([
  fs.readFile('index.html', 'utf8'),
  fs.readFile('popup/shell.js', 'utf8')
]);

const failures = [];

if (indexHtml.includes('optNumericalGoogle')) {
  failures.push('Google numerical-search option is still present in index.html');
}

if (shellJs.includes('numericalSearchGoogle')) {
  failures.push('Google numerical-search option is still present in popup/shell.js');
}

if (!indexHtml.includes('copy-metatags-and-headings')) {
  failures.push('Overview copy-by-template button is missing in index.html');
}

const copyButtonMatch = indexHtml.match(/<button id="copy-metatags-and-headings"[\s\S]*?>([\s\S]*?)<\/button>/);
if (!copyButtonMatch) {
  failures.push('Overview copy-by-template button markup is missing');
} else {
  const buttonInner = copyButtonMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (buttonInner) {
    failures.push('Overview copy-by-template button should be icon-only');
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Settings UI regression test passed');

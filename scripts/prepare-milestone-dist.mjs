import fs from 'node:fs';
import crypto from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('contracts/contrary.py', root), 'utf8').replaceAll('\r\n', '\n');
const release = JSON.parse(fs.readFileSync(new URL('public/milestone-deployment.json', root), 'utf8'));
const hash = crypto.createHash('sha256').update(source).digest('hex');
if (release.chainId !== 61999 || release.version !== 'contrary.v1.2.0' || hash !== release.sourceSha256) {
  throw new Error('Milestone deployment metadata does not match the v1.2 contract source.');
}
const output = new URL('dist/deployment.json', root);
if (!fs.existsSync(new URL('dist/index.html', root))) throw new Error('Build the frontend before preparing its milestone release.');
fs.writeFileSync(output, JSON.stringify(release) + '\n');
console.log('Prepared separate milestone build:', release.address, release.sourceSha256);

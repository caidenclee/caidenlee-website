// Encrypts an Inbox HQ data file so it can sit on a public site safely.
// Usage: node encrypt.mjs plain.json "your passphrase" > data.json
//    or: INBOX_PASS="your passphrase" node encrypt.mjs plain.json > data.json
// The page decrypts it with the same passphrase (PBKDF2 200k + AES-256-GCM).
import { readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const [file, passArg] = process.argv.slice(2);
const pass = passArg || process.env.INBOX_PASS;
if (!file || !pass) {
  console.error('Usage: node encrypt.mjs plain.json "passphrase" > data.json');
  process.exit(1);
}

const plain = readFileSync(file, 'utf8');
JSON.parse(plain); // fail fast on a malformed file

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const km = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
  km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
const b64 = (u) => Buffer.from(u).toString('base64');

process.stdout.write(JSON.stringify({ enc: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) }) + '\n');

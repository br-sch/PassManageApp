// Export/Import helpers for the vault
// - Build JSON payload with folders and entries
// - Encrypt/Decrypt using provided key (hex)
// - Web file pickers and downloads are handled by callers; we just build/parse strings

import CryptoJS from 'crypto-js';
import { encryptWithKey, decryptWithKey } from './cryptoHelpers';

export function buildBackupPayload({ userEmail, folders, items }) {
  return {
    version: 3,
    createdAt: Date.now(),
    emailHash: userEmail ? CryptoJS.SHA256('user:' + userEmail.trim().toLowerCase()).toString() : 'unknown',
    folders: folders.map(f => ({ id: f.id, n: f.name })),
    entries: items.map(i => ({ t: i.title, u: i.username, p: i.password, ts: i.lastChangedAt || Date.now(), id: i.id, fid: i.folderId ?? null })),
  };
}

export function encryptBackupJson(hexKey, jsonPayload) {
  const plain = JSON.stringify(jsonPayload);
  return encryptWithKey(hexKey, plain);
}

export function decryptBackupString(hexKey, encText) {
  const plain = decryptWithKey(hexKey, encText.trim());
  return JSON.parse(plain);
}

export default { buildBackupPayload, encryptBackupJson, decryptBackupString };

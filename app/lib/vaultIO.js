// Prevent expo-router from treating this file as a route
export default {};
/**
 * vaultIO.js
 *
 * Provides helpers for vault import/export, encryption, and backup payload construction.
 * All logic is platform-agnostic; web-specific code has been removed.
 * Includes logging for import/export events and errors.
 */

import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * buildBackupPayload
 *
 * Constructs a backup payload from user email, folders, and items.
 * Logs payload creation.
 * @param {object} params - { userEmail, folders, items }
 * @returns {object} - Backup payload object
 */
export function buildBackupPayload({ userEmail, folders, items }) {
  const payload = {
    version: 3,
    createdAt: Date.now(),
    emailHash: userEmail ? CryptoJS.SHA256('user:' + userEmail.trim().toLowerCase()).toString() : 'unknown',
    folders: folders || [],
    entries: (items || []).map(i => ({
      t: i.title,
      u: i.username,
      p: i.password,
      ts: i.lastChangedAt || Date.now(),
      id: i.id,
      folderId: i.folderId || null,
    })),
  };
  console.log('[VaultIO] Backup payload built:', payload);
  return payload;
}

export function encryptBackupJson(derivedKey, payload) {
  try {
    const plain = JSON.stringify(payload);
    const key = CryptoJS.enc.Hex.parse(derivedKey);
    // Always use expo-crypto for IV generation
    const buf = new Uint8Array(16);
    // Synchronously supported in Expo Go
    Crypto.getRandomValues(buf);
    const iv = CryptoJS.enc.Hex.parse(Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join(''));
    const cipher = CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const result = `${CryptoJS.enc.Hex.stringify(iv)}:${cipher.toString()}`;
    console.log('[VaultIO] Backup encrypted');
    return result;
  } catch (e) {
    console.error('[VaultIO] Backup encryption failed:', e);
    throw e;
  }
}

export function decryptBackupString(derivedKey, encrypted) {
  try {
    const [ivHex, ct] = String(encrypted).split(':');
    const key = CryptoJS.enc.Hex.parse(derivedKey);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    const data = JSON.parse(plain);
    console.log('[VaultIO] Backup decrypted');
    return data;
  } catch (e) {
    console.error('[VaultIO] Backup decryption failed:', e);
    throw e;
  }
}

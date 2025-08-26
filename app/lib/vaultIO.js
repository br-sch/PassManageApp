// Prevent expo-router from treating this file as a route
// ...existing code...
/**
 * vaultIO.js
 *
 * Provides helpers for vault import/export, encryption, and backup payload construction.
 * All logic is platform-agnostic; web-specific code has been removed.
 * Includes logging for import/export events and errors.
 */

import 'react-native-get-random-values';
import { getItem, setItem } from './secureStore';
import { encryptWithKey, decryptWithKey } from './cryptoHelpers';
import { keyFor } from '../context/VaultContext';
// Helper functions for base64 encoding/decoding
function encodeBase64(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  // fallback for browser
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(base64) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  // fallback for browser
  return decodeURIComponent(escape(atob(base64)));
}

/**
 * exportVaultBlob
 * Exports the encrypted vault blob from AsyncStorage for the current user.
 * @param {string} email - User email
 * @returns {Promise<string>} - Encrypted vault blob
 */
export async function exportVaultBlob(email) {
  const key = keyFor(email);
  const blob = await getItem(key);
  if (!blob) throw new Error('No vault data found');
  // Encode the blob as base64 for export
  return encodeBase64(blob);
}

/**
 * importVaultBlob
 * Imports and decrypts the encrypted vault blob for the current user.
 * @param {string} derivedKey - User's derived key
 * @param {string} encryptedBlob - Encrypted vault blob
 * @returns {Promise<object>} - Decrypted vault data (items, folders)
 */
export async function importVaultBlob(derivedKey, encryptedBlob) {
  try {
    // Decode base64 to JSON string
    const jsonStr = decodeBase64(encryptedBlob);
    const encryptedObj = JSON.parse(jsonStr);
    const decrypted = await decryptWithKey(derivedKey, encryptedObj);
    const data = JSON.parse(decrypted);
    console.log('[VaultIO] Vault blob imported and decrypted', data);
    return data;
  } catch (e) {
    console.error('[VaultIO] Vault blob import/decryption failed:', e);
    throw e;
  }
}

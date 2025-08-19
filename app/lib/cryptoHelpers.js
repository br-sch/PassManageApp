/**
 * cryptoHelpers.js
 *
 * Provides cryptographic helper functions for encryption, decryption, and hashing.
 * Uses CryptoJS for all cryptographic operations.
 * Includes logging for key crypto events and errors.
 */

import CryptoJS from 'crypto-js';

/**
 * encryptWithKey
 *
 * Encrypts plaintext using AES-CBC with the provided hex key.
 * Logs encryption events and errors.
 * @param {string} hexKey - AES key in hex
 * @param {string} plain - Plaintext to encrypt
 * @returns {string} - iv:ciphertext string
 */
export function encryptWithKey(hexKey, plain) {
  try {
    const key = CryptoJS.enc.Hex.parse(hexKey);
    let iv;
    try {
      iv = CryptoJS.lib.WordArray.random(16);
    } catch (e) {
      // Fallback if native RNG is unavailable
      const seed = CryptoJS.SHA256(`${Date.now()}:${hexKey}`).toString();
      iv = CryptoJS.enc.Hex.parse(seed.slice(0, 32));
    }
    const cipher = CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const result = `${CryptoJS.enc.Hex.stringify(iv)}:${cipher.toString()}`;
    console.log('[Crypto] Encryption successful');
    return result;
  } catch (e) {
    console.error('[Crypto] Encryption failed:', e);
    throw e;
  }
}

/**
 * decryptWithKey
 *
 * Decrypts ciphertext using AES-CBC with the provided hex key.
 * Logs decryption events and errors.
 * @param {string} hexKey - AES key in hex
 * @param {string} data - iv:ciphertext string
 * @returns {string} - Decrypted plaintext
 */
export function decryptWithKey(hexKey, data) {
  try {
    const [ivHex, ct] = String(data).split(':');
    const key = CryptoJS.enc.Hex.parse(hexKey);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    console.log('[Crypto] Decryption successful');
    return plain;
  } catch (e) {
    console.error('[Crypto] Decryption failed:', e);
    throw e;
  }
}

/**
 * sha256Hex
 *
 * Computes SHA-256 hash of the input and returns hex string.
 * Logs hashing events.
 * @param {string} input - Input string
 * @returns {string} - SHA-256 hex string
 */
export function sha256Hex(input) {
  const hash = CryptoJS.SHA256(input).toString();
  console.log('[Crypto] SHA-256 hash computed');
  return hash;
}

export default { encryptWithKey, decryptWithKey, sha256Hex };

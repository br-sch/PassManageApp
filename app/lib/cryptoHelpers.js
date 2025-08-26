/**
 * cryptoHelpers.js
 *
 * Provides cryptographic helper functions for encryption, decryption, and hashing.
 * Uses CryptoJS for all cryptographic operations.
 * Includes logging for key crypto events and errors.
 */

import AesGcmCrypto from 'react-native-aes-gcm-crypto';

/**
 * encryptWithKey
 * Encrypts plaintext using AES-GCM with the provided base64 key.
 * @param {string} base64Key - AES key in base64
 * @param {string} plain - Plaintext to encrypt
 * @returns {Promise<object>} - { iv, tag, content }
 */
export async function encryptWithKey(base64Key, plain) {
  try {
    const encrypted = await AesGcmCrypto.encrypt(plain, false, base64Key);
    // encrypted = { iv, tag, content }
    console.log('[Crypto] AES-GCM encryption successful:', encrypted);
    return encrypted;
  } catch (e) {
    console.error('[Crypto] AES-GCM encryption failed:', e);
    throw e;
  }
}

/**
 * decryptWithKey
 * Decrypts ciphertext using AES-GCM with the provided base64 key.
 * @param {string} base64Key - AES key in base64
 * @param {object} encrypted - { iv, tag, content }
 * @returns {Promise<string>} - Decrypted plaintext
 */
export async function decryptWithKey(base64Key, encrypted) {
  console.log('[Crypto] Decrypt input:', {
    encrypted,
    content: encrypted?.content,
    iv: encrypted?.iv,
    tag: encrypted?.tag
  });
  try {
    if (!encrypted || !encrypted.content || !encrypted.iv || !encrypted.tag) {
      throw new Error('Missing encrypted data fields');
    }
    const plain = await AesGcmCrypto.decrypt(
      encrypted.content,
      base64Key,
      encrypted.iv,
      encrypted.tag,
      false
    );
    console.log('[Crypto] AES-GCM decryption successful:', plain);
    return plain;
  } catch (e) {
    console.error('[Crypto] AES-GCM decryption failed:', e);
    throw e;
  }
}

export default { encryptWithKey, decryptWithKey };

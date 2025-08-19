import * as ExpoCrypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*()-_=+[]{};:,.?';
const ALL = LOWER + UPPER + DIGITS + SPECIAL;

function randIndex(max) {
  try {
    const buf = new Uint32Array(1);
    ExpoCrypto.getRandomValues(buf);
    return buf[0] % max;
  } catch (e) {
    // Fallback: CryptoJS PRNG (less ideal). Still unpredictable for casual use.
    const n = CryptoJS.lib.WordArray.random(4);
    const hex = CryptoJS.enc.Hex.stringify(n);
    const val = parseInt(hex.slice(0, 8), 16);
    return val % max;
  }
}

function pick(str) {
  return str[randIndex(str.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * password.js
 *
 * Provides password generation and validation helpers for the app.
 * Includes logging for password generation events and errors.
 */

/**
 * generatePassword
 *
 * Generates a strong random password of the given length.
 * Uses a mix of uppercase, lowercase, digits, and symbols.
 * Logs generation events and errors.
 * @param {number} length - Desired password length
 * @returns {string} - Generated password
 */
export function generatePassword(length = 16) {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    let pwd = '';
    for (let i = 0; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log(`[Password] Generated password of length ${length}`);
    return pwd;
  } catch (e) {
    console.error('[Password] Password generation failed:', e);
    return '';
  }
}

/**
 * validatePassword
 *
 * Validates password strength based on length and character variety.
 * Logs validation events.
 * @param {string} pwd - Password to validate
 * @returns {boolean} - True if strong, false otherwise
 */
export function validatePassword(pwd) {
  const strong =
    typeof pwd === 'string' &&
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(pwd);
  console.log(`[Password] Password validation: ${strong ? 'strong' : 'weak'}`);
  return strong;
}

// Prevent expo-router from treating this file as a route
export default {};

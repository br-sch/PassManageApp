import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getItem, setItem, deleteItem } from '../lib/secureStore';
import CryptoJS from 'crypto-js';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// Keys for storage
const SESSION_KEY = 'pm_session_email';
// We store only a verifier per user to validate passwords without storing hashes/salts.
const verifierKeyFor = (emailHash) => `pm_verifier_${emailHash}`;
const attemptsKeyFor = (emailHash) => `pm_attempts_${emailHash}`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { email }
  const [loading, setLoading] = useState(true);
  const [derivedKey, setDerivedKey] = useState(null); // AES key bytes as hex

  useEffect(() => {
    (async () => {
  const email = await getItem(SESSION_KEY);
  if (email) setUser({ email });
      setLoading(false);
    })();
  }, []);

  // Derive a deterministic salt from email so we don't have to persist it.
  const emailSaltHex = (email) => CryptoJS.SHA256(email.trim().toLowerCase()).toString();
  const emailHash = (email) => CryptoJS.SHA256(`user:${email.trim().toLowerCase()}`).toString();

  // Use fewer PBKDF2 iterations on native to avoid blocking the JS thread in Expo Go.
  // These values balance UX and security for a JS-only derivation.
  const PBKDF2_ITERATIONS = Platform.OS === 'web' ? 100000 : 30000;

  // (Removed biometric index helpers; username is required for biometric unlock)

  // Verifier helpers (no RNG): store an HMAC over a constant message using derived key.
  const makeVerifierMac = (hexKey) => {
    const key = CryptoJS.enc.Hex.parse(hexKey);
    const mac = CryptoJS.HmacSHA256('verified', key).toString(); // hex
    return { t: 'mac', mac };
  };
  const checkVerifier = (stored, hexKey) => {
    try {
      const obj = typeof stored === 'string' ? JSON.parse(stored) : stored;
      if (obj && obj.t === 'mac' && typeof obj.mac === 'string') {
        const key = CryptoJS.enc.Hex.parse(hexKey);
        const expected = CryptoJS.HmacSHA256('verified', key).toString();
        return timingSafeEqual(obj.mac, expected);
      }
    } catch {}
    // legacy fallback: AES-encrypted 'verified' of shape iv:ciphertext
    try {
      const [ivHex, ct] = String(stored).split(':');
      if (!ivHex || !ct) return false;
      const key = CryptoJS.enc.Hex.parse(hexKey);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      const msg = bytes.toString(CryptoJS.enc.Utf8);
      return msg === 'verified';
    } catch {
      return false;
    }
  };

  const register = async (email, password) => {
    const ehash = emailHash(email);
    const existingVerifier = await getItem(verifierKeyFor(ehash));
    if (existingVerifier) throw new Error('User already exists');
    const saltHex = emailSaltHex(email);
  const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 256 / 32, iterations: PBKDF2_ITERATIONS }).toString();
  // store verifier as HMAC(no RNG required)
  const verifier = makeVerifierMac(key);
  await setItem(verifierKeyFor(ehash), JSON.stringify(verifier));
    await setItem(SESSION_KEY, email);
    setDerivedKey(key);
    setUser({ email });
  };

  const login = async (email, password) => {
    const ehash = emailHash(email);
    // Brute-force protection: check lock status
    const now = Date.now();
    const aRaw = (await getItem(attemptsKeyFor(ehash))) || '{}';
    const attempts = JSON.parse(aRaw || '{}');
    if (attempts.lockUntil && now < attempts.lockUntil) {
      const remain = Math.max(0, attempts.lockUntil - now);
      const mins = Math.ceil(remain / 60000);
      throw new Error(`Too many attempts. Try again in ${mins}m`);
    }

  const verifier = await getItem(verifierKeyFor(ehash));
  if (!verifier) throw new Error('Invalid credentials');
    const saltHex = emailSaltHex(email);
  const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 256 / 32, iterations: PBKDF2_ITERATIONS }).toString();
    try {
      const ok = checkVerifier(verifier, key);
      if (!ok) throw new Error('Invalid credentials');
    } catch {
      // Update attempts and possibly lock
      const count = (attempts.count || 0) + 1;
      const lockMs = lockDurationFor(count);
      const next = { count, lockUntil: lockMs ? now + lockMs : 0 };
      await setItem(attemptsKeyFor(ehash), JSON.stringify(next));
      if (next.lockUntil && next.lockUntil > now) {
        const mins = Math.ceil(lockMs / 60000);
        throw new Error(`Too many attempts. Locked for ${mins}m`);
      }
      throw new Error('Invalid credentials');
    }
    await setItem(SESSION_KEY, email);
    // Reset attempts on success
    await setItem(attemptsKeyFor(ehash), JSON.stringify({ count: 0, lockUntil: 0 }));
    setDerivedKey(key);
    setUser({ email });
  };

  const logout = async () => {
    await deleteItem(SESSION_KEY);
    setUser(null);
    setDerivedKey(null);
  };

  // Biometric unlock: attempt to derive key without password if previously opted-in.
  // We store an encrypted blob of the verifier key under OS-protected storage.
  const canUseBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  };

  const enableBiometricForUser = async (email, keyHex) => {
    if (!email || !keyHex) throw new Error('Missing data');
    const ok = await canUseBiometrics();
    if (!ok) throw new Error('Biometric unavailable');
    const ehash = emailHash(email);
    await setItem(`pm_bio_${ehash}`, '1');
    // Store the session key to allow biometric unlock later. On native, SecureStore is device-bound.
    await setItem(`pm_bio_key_${ehash}`, keyHex);
  };

  const disableBiometricForUser = async (email) => {
    const ehash = emailHash(email);
    await deleteItem(`pm_bio_${ehash}`);
    await deleteItem(`pm_bio_key_${ehash}`);
  };

  // Verify a password for the given email and return the derived key if valid
  const verifyPassword = async (email, password) => {
    const ehash = emailHash(email);
    const verifier = await getItem(verifierKeyFor(ehash));
    if (!verifier) throw new Error('User not found');
    const saltHex = emailSaltHex(email);
    const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 256 / 32, iterations: PBKDF2_ITERATIONS }).toString();
    const ok = checkVerifier(verifier, key);
    if (!ok) throw new Error('Wrong password');
    return key;
  };

  const biometricUnlock = async (email) => {
    const ehash = emailHash(email);
    const enabled = await getItem(`pm_bio_${ehash}`);
    if (!enabled) throw new Error('Biometric not enabled');
    const ok = await canUseBiometrics();
    if (!ok) throw new Error('Biometric unavailable');
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock vault', disableDeviceFallback: false });
    if (!res.success) throw new Error('Authentication failed');
    const storedKey = await getItem(`pm_bio_key_${ehash}`);
    if (!storedKey) throw new Error('No biometric key stored');
    await setItem(SESSION_KEY, email);
    setDerivedKey(storedKey);
    setUser({ email });
  };

  // (Removed biometricUnlockAny; username must be provided to unlock via biometrics)

  const hasBiometricForEmail = async (email) => {
    const ehash = emailHash(email || '');
    const enabled = await getItem(`pm_bio_${ehash}`);
    return !!enabled;
  };

  // Permanently delete a user and their local data after verifying password
  const deleteUserWithPassword = async (email, password) => {
    // Verify password (text-only, no biometrics)
    await verifyPassword(email, password);
    const ehash = emailHash(email);
    // Delete verifier, attempts, biometrics, and vault data
    await deleteItem(verifierKeyFor(ehash));
    await deleteItem(attemptsKeyFor(ehash));
    await deleteItem(`pm_bio_${ehash}`);
    await deleteItem(`pm_bio_key_${ehash}`);
    await deleteItem(`pm_vault_${ehash}`);
    // Clear session if it's the current user
    const current = await getItem(SESSION_KEY);
    if (current && current.trim().toLowerCase() === email.trim().toLowerCase()) {
      await deleteItem(SESSION_KEY);
      setUser(null);
      setDerivedKey(null);
    }
  };

  const value = useMemo(() => ({ user, loading, register, login, logout, derivedKey, canUseBiometrics, enableBiometricForUser, disableBiometricForUser, biometricUnlock, hasBiometricForEmail, verifyPassword, deleteUserWithPassword }), [user, loading, derivedKey]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Escalating lock durations after N failures (count >= 5 triggers lock)
function lockDurationFor(count) {
  // thresholds: <=4 no lock; 5 => 5m, 6 => 30m, 7 => 2h, >=8 => 24h
  if (count <= 4) return 0;
  if (count === 5) return 5 * 60 * 1000;
  if (count === 6) return 30 * 60 * 1000;
  if (count === 7) return 2 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

// Constant-time compare for equal-length hex strings
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ah = a.toLowerCase();
  const bh = b.toLowerCase();
  if (ah.length !== bh.length) return false;
  let res = 0;
  for (let i = 0; i < ah.length; i++) {
    res |= ah.charCodeAt(i) ^ bh.charCodeAt(i);
  }
  return res === 0;
}

// Prevent expo-router from treating this file as a route by adding a default export
export default {};

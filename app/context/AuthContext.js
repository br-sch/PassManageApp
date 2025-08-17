import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getItem, setItem, deleteItem } from '../lib/secureStore';
import CryptoJS from 'crypto-js';

// Keys for storage
const SESSION_KEY = 'pm_session_email';
// We store only a verifier per user to validate passwords without storing hashes/salts.
const verifierKeyFor = (emailHash) => `pm_verifier_${emailHash}`;

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

  // Minimal AES helpers (CBC + random IV). For verifier only.
  const enc = (plain, hexKey) => {
    const key = CryptoJS.enc.Hex.parse(hexKey);
    const iv = CryptoJS.lib.WordArray.random(16);
    const cipher = CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return `${CryptoJS.enc.Hex.stringify(iv)}:${cipher.toString()}`;
  };
  const dec = (data, hexKey) => {
    const [ivHex, ct] = String(data).split(':');
    const key = CryptoJS.enc.Hex.parse(hexKey);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const register = async (email, password) => {
    const ehash = emailHash(email);
    const existingVerifier = await getItem(verifierKeyFor(ehash));
    if (existingVerifier) throw new Error('User already exists');
    const saltHex = emailSaltHex(email);
    const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 256 / 32, iterations: 100000 }).toString();
    // store verifier encrypted with derived key
    const verifier = enc('verified', key);
    await setItem(verifierKeyFor(ehash), verifier);
    await setItem(SESSION_KEY, email);
    setDerivedKey(key);
    setUser({ email });
  };

  const login = async (email, password) => {
    const ehash = emailHash(email);
    const verifier = await getItem(verifierKeyFor(ehash));
    if (!verifier) throw new Error('Invalid credentials');
    const saltHex = emailSaltHex(email);
    const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 256 / 32, iterations: 100000 }).toString();
    try {
      const msg = dec(verifier, key);
      if (msg !== 'verified') throw new Error('Invalid credentials');
    } catch {
      throw new Error('Invalid credentials');
    }
    await setItem(SESSION_KEY, email);
    setDerivedKey(key);
    setUser({ email });
  };

  const logout = async () => {
    await deleteItem(SESSION_KEY);
    setUser(null);
    setDerivedKey(null);
  };

  const value = useMemo(() => ({ user, loading, register, login, logout, derivedKey }), [user, loading, derivedKey]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

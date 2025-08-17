import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getItem, setItem } from '../lib/secureStore';
import { useAuth } from './AuthContext';
import CryptoJS from 'crypto-js';

// Each user has a vault stored under a namespaced key.
const keyFor = (email) => {
  const ehash = CryptoJS.SHA256(`user:${String(email).trim().toLowerCase()}`).toString();
  return `pm_vault_${ehash}`;
};

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const { user, derivedKey } = useAuth();
  const [items, setItems] = useState([]); // { id, title, username, password }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (user?.email) {
        const raw = (await getItem(keyFor(user.email))) || '[]';
        const stored = JSON.parse(raw);
        // Decrypt if we have a derived key; otherwise show empty until login provides it
    if (stored?.length && derivedKey) {
          try {
            const dec = stored.map((i) => ({
              id: i.id,
              title: decryptText(i.title, derivedKey),
              username: decryptText(i.username, derivedKey),
              password: decryptText(i.password, derivedKey),
      lastChangedAt: i.lastChangedAt ?? Date.now(),
            }));
            setItems(dec);
          } catch (e) {
            console.warn('Decryption failed', e);
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
      setLoading(false);
    })();
  }, [user?.email, derivedKey]);

  const persist = async (next) => {
    setItems(next);
    if (user?.email) {
      const enc = next.map((i) => ({
        id: i.id,
        title: encryptText(i.title, derivedKey),
        username: encryptText(i.username, derivedKey),
        password: encryptText(i.password, derivedKey),
  lastChangedAt: i.lastChangedAt,
      }));
      await setItem(keyFor(user.email), JSON.stringify(enc));
    }
  };

  const addItem = async ({ title, username, password }) => {
    const id = Date.now().toString();
    await persist([{ id, title, username, password, lastChangedAt: Date.now() }, ...items]);
  };

  const removeItem = async (id) => {
    await persist(items.filter((i) => i.id !== id));
  };

  const updateItem = async (id, patch) => {
    const next = items.map((i) => {
      if (i.id !== id) return i;
      const passwordChanged = Object.prototype.hasOwnProperty.call(patch, 'password') && patch.password !== i.password;
      return { ...i, ...patch, ...(passwordChanged ? { lastChangedAt: Date.now() } : {}) };
    });
    await persist(next);
  };

  const value = useMemo(() => ({ items, loading, addItem, removeItem, updateItem }), [items, loading]);
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}

// Helpers
function encryptText(plain, hexKey) {
  if (!hexKey) throw new Error('No key to encrypt');
  const key = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.lib.WordArray.random(16);
  const cipher = CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  // store iv:ciphertext as hex:base64
  return `${CryptoJS.enc.Hex.stringify(iv)}:${cipher.toString()}`;
}

function decryptText(enc, hexKey) {
  if (!hexKey) throw new Error('No key to decrypt');
  const [ivHex, ct] = String(enc).split(':');
  const key = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return bytes.toString(CryptoJS.enc.Utf8);
}

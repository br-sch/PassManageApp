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
  const [items, setItems] = useState([]); // { id, title, username, password, lastChangedAt, folderId }
  const [folders, setFolders] = useState([]); // { id, name }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (user?.email) {
        const raw = (await getItem(keyFor(user.email))) || '[]';
        let stored;
        try { stored = JSON.parse(raw); } catch { stored = []; }
        if (derivedKey) {
          try {
            if (Array.isArray(stored)) {
              // Legacy shape: items only
              const dec = stored.map((i) => ({
                id: i.id,
                title: decryptText(i.title, derivedKey),
                username: decryptText(i.username, derivedKey),
                password: decryptText(i.password, derivedKey),
                lastChangedAt: i.lastChangedAt ?? Date.now(),
                folderId: i.folderId ?? null,
              }));
              setItems(dec);
              setFolders([]);
            } else if (stored && stored.items) {
              const decItems = (stored.items || []).map((i) => ({
                id: i.id,
                title: decryptText(i.title, derivedKey),
                username: decryptText(i.username, derivedKey),
                password: decryptText(i.password, derivedKey),
                lastChangedAt: i.lastChangedAt ?? Date.now(),
                folderId: i.folderId ?? null,
              }));
              const decFolders = (stored.folders || []).map((f) => ({ id: f.id, name: decryptText(f.name, derivedKey) }));
              setItems(decItems);
              setFolders(decFolders);
            } else {
              setItems([]);
              setFolders([]);
            }
          } catch (e) {
            console.warn('Decryption failed', e);
            setItems([]);
            setFolders([]);
          }
        } else {
          setItems([]);
          setFolders([]);
        }
      } else {
        setItems([]);
        setFolders([]);
      }
      setLoading(false);
    })();
  }, [user?.email, derivedKey]);

  const persist = async (nextItems, nextFolders = folders) => {
    setItems(nextItems);
    setFolders(nextFolders);
    if (user?.email) {
      const encItems = nextItems.map((i) => ({
        id: i.id,
        title: encryptText(i.title, derivedKey),
        username: encryptText(i.username, derivedKey),
        password: encryptText(i.password, derivedKey),
        lastChangedAt: i.lastChangedAt,
        folderId: i.folderId ?? null,
      }));
      const encFolders = nextFolders.map((f) => ({ id: f.id, name: encryptText(f.name, derivedKey) }));
      await setItem(keyFor(user.email), JSON.stringify({ items: encItems, folders: encFolders }));
    }
  };

  const addItem = async ({ title, username, password, folderId = null }) => {
    const id = Date.now().toString();
    await persist([{ id, title, username, password, lastChangedAt: Date.now(), folderId }, ...items]);
  };

  const addItemsBulk = async (list, foldersArg = folders) => {
    console.log("Folders state before bulking~~~~~~~~:", foldersArg);
    const base = Date.now();
    const prepared = list.map((e, idx) => ({
      id: (base + idx).toString(),
      title: e.title,
      username: e.username,
      password: e.password,
      lastChangedAt: e.lastChangedAt ?? Date.now(),
      folderId: e.folderId ?? null,
    }));
    const nextItems = [...prepared, ...items];

    // Use the foldersArg provided, or fallback to current state
    await persist(nextItems, [...foldersArg]); // save items + correct folders
    setItems(nextItems);               // update React state so UI sees the new entries
    setFolders([...foldersArg]);       // ensure folders state is updated to match
    console.log("Folders state after bulking~~~~~~~~:", foldersArg);
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

  // Folder APIs
  const addFolder = async (name) => {
    console.log(`Adding folder: ${name}`);
    const id = `f_${Date.now().toString()}`;
    let next;

    // Use functional update so we always base the new folders list on the latest state
    setFolders((prev) => {
      next = [{ id, name }, ...prev];
      return next;
    });

    console.log("Folders state before adding~~~~~~~~:", folders);
    
    await persist(items, next); // save to storage (persist will also setFolders but that's fine)
    console.log("Folders state after adding~~~~~~~~:", next);

    console.log(`✅ Folder created: ${name} (id: ${id})`);
    return id; // only return id, state will be updated outside
  };

  const renameFolder = async (id, name) => {
    const next = folders.map((f) => (f.id === id ? { ...f, name } : f));
    await persist(items, next);
  };

  const removeFolder = async (id) => {
    const nextFolders = folders.filter((f) => f.id !== id);
    const nextItems = items.map((i) => (i.folderId === id ? { ...i, folderId: null } : i));
    await persist(nextItems, nextFolders);
  };

  const value = useMemo(() => ({ items, folders, loading, addItem, addItemsBulk, removeItem, updateItem, addFolder, renameFolder, removeFolder }), [items, folders, loading]);
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
  let iv;
  try {
    iv = CryptoJS.lib.WordArray.random(16);
  } catch (e) {
    // Fallback if native RNG is unavailable: derive IV from timestamp + key hash
    const seed = CryptoJS.SHA256(`${Date.now()}:${hexKey}`).toString();
    iv = CryptoJS.enc.Hex.parse(seed.slice(0, 32));
  }
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

// Prevent expo-router from treating this file as a route by adding a default export
export default {};

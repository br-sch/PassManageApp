/**
 * VaultContext.js
 *
 * Provides vault state and logic for the app, including:
 * - Password and folder management
 * - Bulk import/export operations
 * - Secure persistence and state updates
 * - Folder creation, renaming, and deletion
 *
 * Console loggers are included for key vault events and errors.
 */

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

  /**
   * addItem
   * Adds a new password entry to the vault.
   * Logs addition event and errors.
   */
  const addItem = async ({ title, username, password, folderId = null }) => {
    try {
      const id = Date.now().toString();
      await persist([{ id, title, username, password, lastChangedAt: Date.now(), folderId }, ...items]);
      console.log(`[Vault] Added item: ${title} (id: ${id})`);
    } catch (e) {
      console.error('[Vault] Failed to add item:', e);
    }
  };

  /**
   * addItemsBulk
   * Adds multiple items to the vault at once, updating folders as needed.
   * Logs bulk addition event and errors.
   */
  const addItemsBulk = async (list, foldersArg = folders) => {
    try {
      console.log('[Vault] Bulk adding items:', list.length);
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
      await persist(nextItems, [...foldersArg]);
      setItems(nextItems);
      setFolders([...foldersArg]);
      console.log('[Vault] Bulk add complete. Total items:', nextItems.length);
    } catch (e) {
      console.error('[Vault] Bulk add failed:', e);
    }
  };

  /**
   * removeItem
   * Removes an item from the vault by id.
   * Logs removal event and errors.
   */
  const removeItem = async (id) => {
    try {
      await persist(items.filter((i) => i.id !== id));
      setItems(items.filter((i) => i.id !== id));
      console.log(`[Vault] Removed item: ${id}`);
    } catch (e) {
      console.error('[Vault] Failed to remove item:', e);
    }
  };

  /**
   * updateItem
   * Updates an existing item in the vault.
   * Logs update event and errors.
   */
  const updateItem = async (item) => {
    try {
      const next = items.map((i) => (i.id === item.id ? { ...i, ...item, lastChangedAt: Date.now() } : i));
      await persist(next);
      setItems(next);
      console.log(`[Vault] Updated item: ${item.id}`);
    } catch (e) {
      console.error('[Vault] Failed to update item:', e);
    }
  };

  // Folder APIs
  /**
   * addFolder
   * Adds a new folder to the vault.
   * Logs folder creation event and errors.
   */
  const addFolder = async (name) => {
    try {
      const trimmed = name.trim().toLowerCase();
      if (folders.some(f => f.name.trim().toLowerCase() === trimmed)) {
        console.warn(`[Vault] Folder with name "${name}" already exists.`);
        return; // Optionally show an alert here
      }
      const id = `f_${Date.now().toString()}`;
      setFolders((prev) => {
        const next = [{ id, name }, ...prev];
        console.log(`[Vault] Added folder: ${name} (id: ${id})`);
        return next;
      });
      await persist(items, [{ id, name }, ...folders]);
    } catch (e) {
      console.error('[Vault] Failed to add folder:', e);
    }
  };

  /**
   * renameFolder
   * Renames a folder in the vault.
   * Logs rename event and errors.
   */
  const renameFolder = async (id, name) => {
    try {
      const next = folders.map((f) => (f.id === id ? { ...f, name } : f));
      await persist(items, next);
      setFolders(next);
      console.log(`[Vault] Renamed folder: ${id} to ${name}`);
    } catch (e) {
      console.error('[Vault] Failed to rename folder:', e);
    }
  };

  /**
   * removeFolder
   * Removes a folder from the vault and updates items.
   * Logs removal event and errors.
   */
  const removeFolder = async (id) => {
    try {
      const nextFolders = folders.filter((f) => f.id !== id);
      const nextItems = items.map((i) => (i.folderId === id ? { ...i, folderId: null } : i));
      await persist(nextItems, nextFolders);
      setFolders(nextFolders);
      setItems(nextItems);
      console.log(`[Vault] Removed folder: ${id}`);
    } catch (e) {
      console.error('[Vault] Failed to remove folder:', e);
    }
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

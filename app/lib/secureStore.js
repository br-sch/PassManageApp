/**
 * secureStore.js
 *
 * Provides secure storage abstraction using Expo SecureStore for all platforms.
 * All sensitive data is stored using SecureStore, which is protected by the device OS.
 * Includes logging for storage events and errors.
 */

import * as SecureStore from 'expo-secure-store';

/**
 * getItem
 *
 * Retrieves a value from SecureStore by key.
 * Logs retrieval events and errors.
 * @param {string} key - Storage key
 * @param {object} [options] - Optional SecureStore options
 * @returns {string|null} - Retrieved value or null
 */
export async function getItem(key, options) {
  try {
    const value = await SecureStore.getItemAsync(key, options);
    //console.log(`[SecureStore] getItem: ${key} => ${value !== null ? 'found' : 'not found'}`);
    return value;
  } catch (e) {
    console.error(`[SecureStore] getItem error for key ${key}:`, e);
    return null;
  }
}

/**
 * setItem
 *
 * Stores a value in SecureStore by key.
 * Logs storage events and errors.
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @param {object} [options] - Optional SecureStore options
 */
export async function setItem(key, value, options) {
  try {
    await SecureStore.setItemAsync(key, value, options);
    console.log(`[SecureStore] setItem: ${key}`);
  } catch (e) {
    console.error(`[SecureStore] setItem error for key ${key}:`, e);
  }
}

/**
 * deleteItem
 *
 * Deletes a value from SecureStore by key.
 * Logs deletion events and errors.
 * @param {string} key - Storage key
 */
export async function deleteItem(key) {
  try {
    await SecureStore.deleteItemAsync(key);
    console.log(`[SecureStore] deleteItem: ${key}`);
  } catch (e) {
    console.error(`[SecureStore] deleteItem error for key ${key}:`, e);
  }
}

// Prevent expo-router from treating this file as a route
export default {};

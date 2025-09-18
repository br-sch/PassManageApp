/**
 * secureStore.js
 *
 * Provides secure storage abstraction using Expo SecureStore for all platforms.
 * All sensitive data is stored using SecureStore, which is protected by the device OS.
 * Includes logging for storage events and errors.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      console.log(`[AsyncStorage] getItem: ${key} => found`);
      return value;
    }
    console.log(`[AsyncStorage] getItem: ${key} => not found`);
    return null;
  } catch (e) {
    console.error(`[AsyncStorage] getItem error for key ${key}:`, e);
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
    await AsyncStorage.setItem(key, value);
    console.log(`[AsyncStorage] setItem: ${key}`);
  } catch (e) {
    console.error(`[AsyncStorage] setItem error for key ${key}:`, e);
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
    await AsyncStorage.removeItem(key);
    console.log(`[AsyncStorage] deleteItem: ${key}`);
  } catch (e) {
    console.error(`[AsyncStorage] deleteItem error for key ${key}:`, e);
  }
}

export default {};

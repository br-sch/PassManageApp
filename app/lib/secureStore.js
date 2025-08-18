// Simple storage abstraction using Expo SecureStore when available,
// falling back to AsyncStorage on platforms where SecureStore is limited (e.g., web).
// 
// Storage Strategy:
// - Small sensitive data (keys, verifiers): SecureStore (when available)
// - Large data (vault contents >2KB): AsyncStorage (to avoid SecureStore size limits)
// - Web platform: AsyncStorage only (SecureStore not persistent on web)
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// On web, SecureStore is not fully persistent; prefer AsyncStorage there.
const useAsyncOnly = Platform.OS === 'web';

export async function getItem(key, options) {
  try {
    // For vault data, try AsyncStorage first (where large data is likely stored)
    if (key.includes('pm_vault_')) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) return value;
      // Fallback to SecureStore for legacy data
      if (!useAsyncOnly) {
        return await SecureStore.getItemAsync(key, options);
      }
      return null;
    }

    // For other items, prefer SecureStore when available
    if (!useAsyncOnly) {
      const v = await SecureStore.getItemAsync(key, options);
      return v;
    }
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('getItem error', e);
    return null;
  }
}

export async function setItem(key, value, options) {
  try {
    // For large values (>2048 bytes) or vault data, use AsyncStorage to avoid SecureStore limits
    const shouldUseAsync = useAsyncOnly || value.length > 2048 || key.includes('pm_vault_');
    
    if (!shouldUseAsync) {
      await SecureStore.setItemAsync(key, value, options);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('setItem error', e);
  }
}

export async function deleteItem(key) {
  try {
    // Delete from both stores to handle migration cases
    if (!useAsyncOnly) {
      await SecureStore.deleteItemAsync(key);
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('deleteItem error', e);
  }
}

// Prevent expo-router from treating this file as a route
export default {};

// Simple storage abstraction using Expo SecureStore when available,
// falling back to AsyncStorage on platforms where SecureStore is limited (e.g., web).
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// On web, SecureStore is not fully persistent; prefer AsyncStorage there.
const useAsyncOnly = Platform.OS === 'web';

export async function getItem(key) {
  try {
  if (!useAsyncOnly) {
      const v = await SecureStore.getItemAsync(key);
      return v;
    }
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('getItem error', e);
    return null;
  }
}

export async function setItem(key, value) {
  try {
  if (!useAsyncOnly) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('setItem error', e);
  }
}

export async function deleteItem(key) {
  try {
  if (!useAsyncOnly) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('deleteItem error', e);
  }
}

/**
 * clipboard.js
 *
 * Provides a cross-platform clipboard helper for copying text.
 * Uses Expo Clipboard API on native, and browser clipboard on web.
 * Includes logging for copy events and errors.
 */

import Clipboard from '@react-native-clipboard/clipboard';
import { Platform, Alert } from 'react-native';

/**
 * copyToClipboard
 *
 * Copies the given text to the clipboard and shows a success message.
 * Logs copy events and errors for debugging.
 * @param {string} text - Text to copy
 * @param {string} [successMsg='Password copied'] - Message to show on success
 */
export async function copyToClipboard(text, successMsg = 'Password copied') {
  if (Platform.OS === 'web') {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert(successMsg);
        console.log('[Clipboard] Text copied using navigator.clipboard');
        return;
      }
    } catch (e) {
      console.error('[Clipboard] navigator.clipboard failed:', e);
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        alert(successMsg);
        console.log('[Clipboard] Text copied using execCommand');
      } else {
        alert('Copy not supported');
        console.warn('[Clipboard] execCommand copy not supported');
      }
    } catch (e) {
      alert('Copy failed');
      console.error('[Clipboard] execCommand copy failed:', e);
    }
  } else {
    try {
      Clipboard.setString(text);
      Alert.alert('Copied', successMsg);
      console.log('[Clipboard] Text copied using RN Clipboard');
    } catch (e) {
      Alert.alert('Copy failed', 'Could not copy to clipboard');
      console.error('[Clipboard] RN Clipboard copy failed:', e);
    }
  }
}

export default { copyToClipboard };

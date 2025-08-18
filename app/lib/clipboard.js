// Clipboard helper with web fallback
// copyToClipboard(text, msg?) -> copies text and shows a small alert/toast
import { Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export async function copyToClipboard(text, successMsg = 'Copied') {
  if (Platform.OS === 'web') {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert(successMsg);
        return;
      }
    } catch {}
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
      if (ok) alert(successMsg); else alert('Copy not supported');
    } catch (e) {
      alert('Copy failed');
    }
  } else {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', successMsg);
    } catch (e) {
      Alert.alert('Copy failed', 'Could not copy to clipboard');
    }
  }
}

export default { copyToClipboard };

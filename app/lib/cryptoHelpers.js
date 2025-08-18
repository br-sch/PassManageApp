// Crypto helpers for encrypting/decrypting vault exports
import CryptoJS from 'crypto-js';

export function encryptWithKey(hexKey, plain) {
  const key = CryptoJS.enc.Hex.parse(hexKey);
  let iv;
  try {
    iv = CryptoJS.lib.WordArray.random(16);
  } catch (e) {
    const seed = CryptoJS.SHA256(`${Date.now()}:${hexKey}`).toString();
    iv = CryptoJS.enc.Hex.parse(seed.slice(0, 32));
  }
  const cipher = CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return `${CryptoJS.enc.Hex.stringify(iv)}:${cipher.toString()}`;
}

export function decryptWithKey(hexKey, data) {
  const [ivHex, ct] = String(data).split(':');
  const key = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return bytes.toString(CryptoJS.enc.Utf8);
}

export default { encryptWithKey, decryptWithKey };

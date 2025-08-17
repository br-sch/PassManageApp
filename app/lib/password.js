import * as ExpoCrypto from 'expo-crypto';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*()-_=+[]{};:,.?';
const ALL = LOWER + UPPER + DIGITS + SPECIAL;

function randIndex(max) {
  const buf = new Uint32Array(1);
  ExpoCrypto.getRandomValues(buf);
  return buf[0] % max;
}

function pick(str) {
  return str[randIndex(str.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function generatePassword(len = 16) {
  const length = Math.max(12, Math.min(len, 24)); // keep between 12 and 24
  const req = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIAL)];
  const rest = [];
  for (let i = req.length; i < length; i++) rest.push(pick(ALL));
  const chars = shuffle([...req, ...rest]);
  return chars.join('');
}

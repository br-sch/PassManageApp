// Styles: Auth screen (login/register)
// Centralized to avoid duplication and ensure consistent dark theme
import { StyleSheet } from 'react-native';

// Styles for the Auth (login/register) screen
export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  brandRow: { flexDirection: 'column', alignItems: 'center', marginBottom: 6 },
  brandIcon: { width: 68, height: 68, borderRadius: 10, marginBottom: 8 },
  title: { color: 'white', fontSize: 36, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#cbd5e1', fontSize: 16, marginBottom: 24 },
  form: { width: '100%', maxWidth: 420, backgroundColor: '#111827', borderRadius: 16, padding: 20, gap: 12 },
  input: { backgroundColor: '#1f2937', color: 'white', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  primaryBtn: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#052e16', fontWeight: '700', fontSize: 16 },
  genBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  genBtnText: { color: 'white', fontWeight: '700' },
  link: { color: '#93c5fd', textAlign: 'center', marginTop: 10 },
  error: { color: '#fca5a5', textAlign: 'center' },
  footer: { color: '#94a3b8', marginTop: 20, fontSize: 12 },
  eyeBtn: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  passwordInput: { paddingRight: 44 },
});

export default authStyles;

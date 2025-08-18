// Styles: Vault screen
// Centralized here to keep JSX lean and consistent across components
import { StyleSheet } from 'react-native';

// Styles for the Vault screen
export const vaultStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8, marginBottom: 16, gap: 12 },
  title: { color: 'white', fontSize: 28, fontWeight: '800' },
  userEmail: { color: '#94a3b8', marginTop: 4 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', maxWidth: '55%' },
  form: { backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 10, marginBottom: 12 },
  input: { backgroundColor: '#1f2937', color: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '700' },
  genBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  genBtnText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  cardMeta: { color: '#cbd5e1', marginTop: 2 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  logoutBtn: { backgroundColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  eyeInlineBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  passwordInput: { paddingRight: 44 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  error: { color: '#fca5a5', textAlign: 'center', fontSize: 14, fontWeight: '600' },
});

export default vaultStyles;

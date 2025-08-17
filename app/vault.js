import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal } from 'react-native';
import { useVault } from './context/VaultContext';
import { useAuth } from './context/AuthContext';
import { router } from 'expo-router';
import { generatePassword } from './lib/password';
import { Feather } from '@expo/vector-icons';

export default function VaultScreen() {
  const { items, addItem, removeItem, updateItem } = useVault();
  const { user, logout } = useAuth();

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(null); // item being edited
  const [editTitle, setEditTitle] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);

  const canAdd = title.trim() && username.trim() && password;

  const onAdd = async () => {
    await addItem({ title: title.trim(), username: username.trim(), password });
    setTitle('');
    setUsername('');
    setPassword('');
  };

  const since = (ts) => {
    const d = Date.now() - (ts || 0);
    const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
    if (d < hour) return `${Math.max(1, Math.floor(d / min))}m ago`;
    if (d < day) return `${Math.floor(d / hour)}h ago`;
    return `${Math.floor(d / day)}d ago`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>User: {item.username}</Text>
        <Text style={styles.cardMeta}>Pass: {item.password}</Text>
        <Text style={[styles.cardMeta, { fontStyle: 'italic', color: '#9ca3af' }]}>Changed {since(item.lastChangedAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setEditing(item);
            setEditTitle(item.title);
            setEditUsername(item.username);
            setEditPassword(item.password);
            setEditShowPassword(false);
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.id)}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Vault</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: '#94a3b8' }}>{user?.email}</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace('/');
            }}
          >
            <Text style={{ color: '#1f2937', fontWeight: '700' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.form}>
        <TextInput placeholder="Interface / Company / Source" style={styles.input} value={title} onChangeText={setTitle} />
        <TextInput placeholder="Username" style={styles.input} value={username} onChangeText={setUsername} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
            <TextInput
              placeholder="Password"
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              style={styles.eyeBtn}
            >
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#cbd5e1" style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.genBtn}
            onPress={() => setPassword(generatePassword(16))}
            accessibilityLabel="Generate strong password"
          >
            <Text style={styles.genBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.addBtn, !canAdd && { opacity: 0.5 }]} onPress={onAdd} disabled={!canAdd}>
          <Text style={styles.addBtnText}>Add password</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>No passwords yet. Add one above.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <Modal animationType="slide" visible={!!editing} transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            <TextInput placeholder="Interface / Company / Source" style={styles.input} value={editTitle} onChangeText={setEditTitle} />
            <TextInput placeholder="Username" style={styles.input} value={editUsername} onChangeText={setEditUsername} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  placeholder="Password"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!editShowPassword}
                  value={editPassword}
                  onChangeText={setEditPassword}
                />
                <TouchableOpacity
                  onPress={() => setEditShowPassword((v) => !v)}
                  accessibilityLabel={editShowPassword ? 'Hide password' : 'Show password'}
                  style={styles.eyeBtn}
                >
                  <Feather name={editShowPassword ? 'eye' : 'eye-off'} size={20} color="#cbd5e1" style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.genBtn}
                onPress={() => setEditPassword(generatePassword(16))}
                accessibilityLabel="Generate strong password"
              >
                <Text style={styles.genBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={async () => {
                await updateItem(editing.id, { title: editTitle.trim(), username: editUsername.trim(), password: editPassword });
                setEditing(null);
              }}>
                <Text style={styles.addBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setEditing(null)}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 },
  title: { color: 'white', fontSize: 28, fontWeight: '800' },
  form: { backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 10, marginBottom: 12 },
  input: { backgroundColor: '#1f2937', color: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#052e16', fontWeight: '700' },
  genBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  genBtnText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  cardMeta: { color: '#cbd5e1', marginTop: 2 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutBtn: { backgroundColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  eyeBtn: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  passwordInput: { paddingRight: 44 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useVault } from './context/VaultContext';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { router } from 'expo-router';
import { generatePassword } from './lib/password';
import { Feather } from '@expo/vector-icons';

export default function VaultScreen() {
  const { items, folders, addItem, addItemsBulk, removeItem, updateItem, addFolder, renameFolder, removeFolder } = useVault();
  const { user, logout, canUseBiometrics, enableBiometricForUser, disableBiometricForUser, derivedKey, verifyPassword, hasBiometricForEmail, deleteUserWithPassword } = useAuth();

  // Inline add form removed in favor of modal
  const [editing, setEditing] = useState(null); // item being edited
  const [editTitle, setEditTitle] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editFolderId, setEditFolderId] = useState(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportBlob, setExportBlob] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importBlob, setImportBlob] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null); // null => all
  const [visiblePasswords, setVisiblePasswords] = useState({}); // id -> boolean
  const [showManageFoldersModal, setShowManageFoldersModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addShowPassword, setAddShowPassword] = useState(false);
  const [addFolderId, setAddFolderId] = useState(null);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [deletePwd, setDeletePwd] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const canAdd = addTitle.trim() && addUsername.trim() && addPassword;

  useEffect(() => {
    (async () => {
      try {
        const avail = await canUseBiometrics();
        setBioAvailable(avail);
        setBioEnabled(user?.email ? await hasBiometricForEmail(user.email) : false);
      } catch {}
    })();
  }, []);

  const exportVault = async () => {
    // Ask user to enter their password to lock the ZIP
    const pwd = prompt('Enter your account password to encrypt the backup:');
    if (!pwd) return;
    let key;
    try { key = await verifyPassword(user.email, pwd); } catch (e) { alert('Wrong password'); return; }
    const payload = {
      version: 3,
      createdAt: Date.now(),
      emailHash: user?.email ? CryptoJS.SHA256('user:' + user.email.trim().toLowerCase()).toString() : 'unknown',
      entries: items.map(i => ({ t: i.title, u: i.username, p: i.password, ts: i.lastChangedAt || Date.now(), id: i.id })),
    };
    const plain = JSON.stringify(payload);
    const encText = encryptWithKey(key, plain);
    const blob = new Blob([encText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaulton-backup.json.enc';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Native-only: encrypt JSON with current derivedKey and show as text for copy/save
  const exportVaultNative = async () => {
    try {
      if (!derivedKey) return Alert.alert('Not ready', 'Please log in first.');
      const payload = {
        version: 3,
        createdAt: Date.now(),
        emailHash: user?.email ? CryptoJS.SHA256('user:' + user.email.trim().toLowerCase()).toString() : 'unknown',
        entries: items.map(i => ({ t: i.title, u: i.username, p: i.password, ts: i.lastChangedAt || Date.now(), id: i.id })),
      };
      const plain = JSON.stringify(payload);
      const enc = encryptWithKey(derivedKey, plain);
      setExportBlob(enc);
      setShowExportModal(true);
    } catch (e) {
      console.warn('Export failed', e);
      Alert.alert('Export failed', 'Could not create backup');
    }
  };

  // Native-only: paste encrypted text, decrypt with derivedKey, and import entries
  const importEncryptedBackupNative = async () => {
    if (!derivedKey) return Alert.alert('Not ready', 'Please log in first.');
    setImportBlob('');
    setShowImportModal(true);
  };

  const importEncryptedBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.enc,text/plain,application/octet-stream';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const pwd = prompt('Enter your account password to decrypt the backup:');
      if (!pwd) return;
      try {
        const key = await verifyPassword(user.email, pwd);
        const text = await file.text();
        const plain = decryptWithKey(key, text.trim());
        const data = JSON.parse(plain);
        if (!Array.isArray(data.entries)) throw new Error('Invalid backup');
  await addItemsBulk(data.entries.map(e => ({ title: e.t, username: e.u, password: e.p, lastChangedAt: e.ts })));
        alert('Import completed');
      } catch (e) {
        console.warn('Import failed', e);
        alert('Failed to import backup');
      }
    };
    input.click();
  };

  const importVault = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data.entries)) throw new Error('Invalid backup');
  // naive merge: add all entries as new ones (keeping original ids can conflict)
  await addItemsBulk(data.entries.map(e => ({ title: e.t, username: e.u, password: e.p, lastChangedAt: e.ts })));
      } catch (e) {
        console.warn('Import failed', e);
      }
    };
    input.click();
  };

  // Add handled via modal now

  const since = (ts) => {
    const d = Date.now() - (ts || 0);
    const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
    if (d < hour) return `${Math.max(1, Math.floor(d / min))}m ago`;
    if (d < day) return `${Math.floor(d / hour)}h ago`;
    return `${Math.floor(d / day)}d ago`;
  };

  const renderItem = ({ item }) => {
    const isVisible = !!visiblePasswords[item.id];
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>User: {item.username}</Text>
          <View style={styles.passRow}>
            <Text style={styles.cardMeta}>Pass: {isVisible ? item.password : '••••••••'}</Text>
            <TouchableOpacity
              style={styles.eyeInlineBtn}
              onPress={() => setVisiblePasswords((v) => ({ ...v, [item.id]: !v[item.id] }))}
              accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
            >
              <Feather name={isVisible ? 'eye' : 'eye-off'} size={16} color="#cbd5e1" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.eyeInlineBtn}
              onPress={() => copyToClipboard(item.password)}
              accessibilityLabel="Copy password"
            >
              <Feather name="copy" size={16} color="#cbd5e1" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </View>
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
              setEditFolderId(item.folderId ?? null);
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Vault</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => {
            setAddTitle('');
            setAddUsername('');
            setAddPassword('');
            setAddShowPassword(false);
            setAddFolderId(selectedFolder ?? null);
            setShowAddModal(true);
          }}>
            <Text style={styles.actionBtnText}>Add Entry +</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#374151' }]} onPress={() => setShowActions(true)}>
            <Text style={styles.actionBtnText}>Actions ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Folder controls */}
      <View style={[styles.form, { marginTop: -4 }] }>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[styles.secondaryBtn, selectedFolder == null && { backgroundColor: '#16a34a' }]} onPress={() => setSelectedFolder(null)}>
            <Text style={{ color: 'white', fontWeight: '700' }}>All</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {folders.map((f) => (
                <TouchableOpacity key={f.id} style={[styles.secondaryBtn, selectedFolder === f.id && { backgroundColor: '#16a34a' }]} onPress={() => setSelectedFolder(f.id)}>
                  <Text style={{ color: 'white' }}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => setShowManageFoldersModal(true)}>
            <Text style={{ color: 'white', fontWeight: '700' }}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Inline add entry form removed; use Add Entry button in header */}

      <FlatList
  data={items.filter((i) => !selectedFolder || i.folderId === selectedFolder)}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>No passwords yet. Tap "Add Entry".</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <Modal animationType="slide" visible={!!editing} transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            <TextInput placeholder="Interface / Company / Source" placeholderTextColor="#9ca3af" style={styles.input} value={editTitle} onChangeText={setEditTitle} />
            <TextInput placeholder="Username" placeholderTextColor="#9ca3af" style={styles.input} value={editUsername} onChangeText={setEditUsername} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
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
            {/* Folder picker for edit */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.cardMeta, { marginBottom: 6 }]}>Folder</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.secondaryBtn, !editFolderId && { backgroundColor: '#16a34a' }]} onPress={() => setEditFolderId(null)}>
                    <Text style={{ color: 'white' }}>No folder</Text>
                  </TouchableOpacity>
                  {folders.map((f) => (
                    <TouchableOpacity key={f.id} style={[styles.secondaryBtn, editFolderId === f.id && { backgroundColor: '#16a34a' }]} onPress={() => setEditFolderId(f.id)}>
                      <Text style={{ color: 'white' }}>{f.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={async () => {
                await updateItem(editing.id, { title: editTitle.trim(), username: editUsername.trim(), password: editPassword, folderId: editFolderId });
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

      {/* Add Entry modal */}
      <Modal animationType="slide" visible={showAddModal} transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Entry</Text>
            <TextInput placeholder="Interface / Company / Source" placeholderTextColor="#9ca3af" style={styles.input} value={addTitle} onChangeText={setAddTitle} />
            <TextInput placeholder="Username" placeholderTextColor="#9ca3af" style={styles.input} value={addUsername} onChangeText={setAddUsername} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!addShowPassword}
                  value={addPassword}
                  onChangeText={setAddPassword}
                />
                <TouchableOpacity
                  onPress={() => setAddShowPassword((v) => !v)}
                  accessibilityLabel={addShowPassword ? 'Hide password' : 'Show password'}
                  style={styles.eyeBtn}
                >
                  <Feather name={addShowPassword ? 'eye' : 'eye-off'} size={20} color="#cbd5e1" style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.genBtn}
                onPress={() => setAddPassword(generatePassword(16))}
                accessibilityLabel="Generate strong password"
              >
                <Text style={styles.genBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>
            {/* Folder picker for add */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.cardMeta, { marginBottom: 6 }]}>Folder</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.secondaryBtn, !addFolderId && { backgroundColor: '#16a34a' }]} onPress={() => setAddFolderId(null)}>
                    <Text style={{ color: 'white' }}>No folder</Text>
                  </TouchableOpacity>
                  {folders.map((f) => (
                    <TouchableOpacity key={f.id} style={[styles.secondaryBtn, addFolderId === f.id && { backgroundColor: '#16a34a' }]} onPress={() => setAddFolderId(f.id)}>
                      <Text style={{ color: 'white' }}>{f.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }, !canAdd && { opacity: 0.5 }]} disabled={!canAdd} onPress={async () => {
                await addItem({ title: addTitle.trim(), username: addUsername.trim(), password: addPassword, folderId: addFolderId });
                setShowAddModal(false);
                setAddTitle('');
                setAddUsername('');
                setAddPassword('');
                setAddShowPassword(false);
              }}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowAddModal(false)}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Folders modal */}
      <Modal animationType="slide" visible={showManageFoldersModal} transparent onRequestClose={() => setShowManageFoldersModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manage Folders</Text>
            {/* Create new folder inside Manage modal */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="New folder name"
                placeholderTextColor="#9ca3af"
                style={[styles.input, { flex: 1 }]}
                value={newFolderName}
                onChangeText={setNewFolderName}
              />
              <TouchableOpacity
                style={[styles.secondaryBtn, !newFolderName.trim() && { opacity: 0.5 }]}
                disabled={!newFolderName.trim()}
                onPress={async () => {
                  const n = newFolderName.trim();
                  if (!n) return;
                  const id = await addFolder(n);
                  setSelectedFolder(id);
                  setNewFolderName('');
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {folders.length === 0 ? (
                <Text style={{ color: '#94a3b8' }}>No folders yet.</Text>
              ) : (
                folders.map((f) => (
                  <View key={f.id} style={{ backgroundColor: '#111827', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    {renamingFolderId === f.id ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          placeholder="Folder name"
                          placeholderTextColor="#9ca3af"
                          style={styles.input}
                          value={renameText}
                          onChangeText={setRenameText}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.addBtn, { flex: 1 }, !renameText.trim() && { opacity: 0.5 }]}
                            disabled={!renameText.trim()}
                            onPress={async () => {
                              const n = renameText.trim();
                              if (!n) return;
                              await renameFolder(f.id, n);
                              setRenamingFolderId(null);
                              setRenameText('');
                            }}
                          >
                            <Text style={styles.addBtnText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deleteBtn, { flex: 1, alignItems: 'center' }]}
                            onPress={() => { setRenamingFolderId(null); setRenameText(''); }}
                          >
                            <Text style={{ color: 'white', fontWeight: '700' }}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>{f.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setRenamingFolderId(f.id); setRenameText(f.name); }}>
                            <Text style={{ color: 'white', fontWeight: '700' }}>Rename</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deleteBtn]}
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                // eslint-disable-next-line no-alert
                                if (confirm(`Delete folder "${f.name}"? Items will be kept under All.`)) {
                                  (async () => {
                                    await removeFolder(f.id);
                                    if (selectedFolder === f.id) setSelectedFolder(null);
                                  })();
                                }
                              } else {
                                Alert.alert('Delete folder', `Delete folder "${f.name}"? Items will be moved to All.`, [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: async () => { await removeFolder(f.id); if (selectedFolder === f.id) setSelectedFolder(null); } },
                                ]);
                              }
                            }}
                          >
                            <Text style={{ color: 'white', fontWeight: '700' }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={() => setShowManageFoldersModal(false)}>
                <Text style={styles.addBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Native export modal (text-based) */}
      <Modal animationType="slide" visible={showExportModal} transparent onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Encrypted Backup</Text>
            <Text style={{ color: '#cbd5e1' }}>Copy this text and save it somewhere safe.</Text>
            <ScrollView style={{ maxHeight: 240, marginTop: 8 }}>
              <Text selectable style={{ color: '#e5e7eb' }}>{exportBlob}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, alignItems: 'center' }]}
                onPress={() => copyToClipboard(exportBlob, 'Backup copied to clipboard')}
                accessibilityLabel="Copy encrypted backup"
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={() => setShowExportModal(false)}>
                <Text style={styles.addBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Native import modal (paste text) */}
      <Modal animationType="slide" visible={showImportModal} transparent onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Paste Encrypted Backup</Text>
            <TextInput
              placeholder="Paste encrypted text here"
              placeholderTextColor="#9ca3af"
              multiline
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]}
              value={importBlob}
              onChangeText={setImportBlob}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.addBtn, { flex: 1 }]}
                onPress={async () => {
                  try {
                    const plain = decryptWithKey(derivedKey, importBlob.trim());
                    const data = JSON.parse(plain);
                    if (!Array.isArray(data.entries)) throw new Error('Invalid backup');
                    await addItemsBulk(data.entries.map(e => ({ title: e.t, username: e.u, password: e.p, lastChangedAt: e.ts })));
                    setShowImportModal(false);
                    Alert.alert('Import completed');
                  } catch (e) {
                    Alert.alert('Import failed', 'Invalid or wrong key');
                  }
                }}
              >
                <Text style={styles.addBtnText}>Import</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowImportModal(false)}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Actions modal */}
      <Modal animationType="fade" visible={showActions} transparent onRequestClose={() => setShowActions(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Actions</Text>
            {bioAvailable && (
              bioEnabled ? (
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={async () => { try { await disableBiometricForUser(user.email); setBioEnabled(false); } catch {} finally { setShowActions(false); } }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Disable Fingerprint</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={async () => { try { if (derivedKey) { await enableBiometricForUser(user.email, derivedKey); setBioEnabled(true); } } catch {} finally { setShowActions(false); } }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Enable Fingerprint</Text>
                </TouchableOpacity>
              )
            )}
            {Platform.OS === 'web' ? (
              <>
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setShowActions(false); exportVault(); }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Export backup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setShowActions(false); importEncryptedBackup(); }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Import backup</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setShowActions(false); exportVaultNative(); }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Export Vault</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setShowActions(false); importEncryptedBackupNative(); }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Import Vault</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: '#fbbf24' }]} onPress={async () => { setShowActions(false); await logout(); router.replace('/'); }}>
              <Text style={{ color: '#1f2937', fontWeight: '700' }}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => { setShowActions(false); setDeletePwd(''); setShowDeleteModal(true); }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Delete account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteBtn, { alignItems: 'center' }]} onPress={() => setShowActions(false)}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account modal (typed password only) */}
      <Modal animationType="slide" visible={showDeleteModal} transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={{ color: '#fca5a5' }}>This will permanently delete your local account and vault. This cannot be undone.</Text>
            <TextInput
              placeholder="Type your account password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.input}
              value={deletePwd}
              onChangeText={setDeletePwd}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.addBtn, { flex: 1 }, (!deletePwd.trim() || deletingAccount) && { opacity: 0.5 }]}
                disabled={!deletePwd.trim() || deletingAccount}
                onPress={async () => {
                  try {
                    setDeletingAccount(true);
                    await deleteUserWithPassword(user.email, deletePwd.trim());
                    setShowDeleteModal(false);
                    setDeletePwd('');
                    if (Platform.OS === 'web') alert('Account deleted');
                    router.replace('/');
                  } catch (e) {
                    if (Platform.OS === 'web') alert(e.message || 'Wrong password'); else Alert.alert('Delete failed', e.message || 'Wrong password');
                  } finally {
                    setDeletingAccount(false);
                  }
                }}
              >
                {deletingAccount ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#052e16" />
                    <Text style={styles.addBtnText}>Deleting…</Text>
                  </View>
                ) : (
                  <Text style={styles.addBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowDeleteModal(false)}>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8, marginBottom: 16, gap: 12 },
  title: { color: 'white', fontSize: 28, fontWeight: '800' },
  userEmail: { color: '#94a3b8', marginTop: 4 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', maxWidth: '55%' },
  form: { backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 10, marginBottom: 12 },
  input: { backgroundColor: '#1f2937', color: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#052e16', fontWeight: '700' },
  genBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  genBtnText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  cardMeta: { color: '#cbd5e1', marginTop: 2 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutBtn: { backgroundColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: 'white', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  eyeBtn: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  eyeInlineBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  passwordInput: { paddingRight: 44 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
});

// Encryption helpers for native backup (AES-CBC iv:cipher)
function encryptWithKey(hexKey, plain) {
  const key = CryptoJS.enc.Hex.parse(hexKey);
  let iv;
  try {
    iv = CryptoJS.lib.WordArray.random(16);
  } catch (e) {
    // Fallback if native RNG is unavailable (e.g., tunnel/Expo Go edge cases)
    const seed = CryptoJS.SHA256(`${Date.now()}:${hexKey}`).toString();
    iv = CryptoJS.enc.Hex.parse(seed.slice(0, 32));
  }
  const cipher = CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return `${CryptoJS.enc.Hex.stringify(iv)}:${cipher.toString()}`;
}

function decryptWithKey(hexKey, data) {
  const [ivHex, ct] = String(data).split(':');
  const key = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const bytes = CryptoJS.AES.decrypt(ct, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Clipboard helper with web fallback
async function copyToClipboard(text, successMsg = 'Password copied') {
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

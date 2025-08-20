// VaultScreen
// Responsibilities:
// - Presents the encrypted vault UI (list, search, folder management, add/edit)
// - Handles export/import UX while delegating crypto/merge logic to lib helpers
// - Enforces auto-logout on inactivity via a reusable hook
// Sections below are annotated to ease maintenance.


import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useVault } from './context/VaultContext';
import { useAuth } from './context/AuthContext';
// useEffect imported above
import { router } from 'expo-router';
import { generatePassword } from './lib/password';
import { Feather } from '@expo/vector-icons';
import { vaultStyles as styles } from './styles/vaultStyles';
import { copyToClipboard } from './lib/clipboard';
import { since } from './lib/time';
import { buildBackupPayload, encryptBackupJson, decryptBackupString } from './lib/vaultIO';
import { mergeBackupData } from './lib/vaultMerge';
import EntryItem from './components/EntryItem';
import { useInactivityTimer } from './hooks/useInactivityTimer';

export default function VaultScreen() {
  // Contexts: Vault data and Auth/session state
  const { items, folders, addItem, addItemsBulk, removeItem, updateItem, addFolder, renameFolder, removeFolder } = useVault();
  const { user, logout, canUseBiometrics, enableBiometricForUser, disableBiometricForUser, derivedKey, verifyPassword, hasBiometricForEmail, deleteUserWithPassword } = useAuth();

  // Local UI state
  // Inline add form was removed in favor of a proper modal
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
  const [search, setSearch] = useState('');
  const [addError, setAddError] = useState('');
  // Security: Auto-logout after inactivity
  const { reset: onAnyInteraction } = useInactivityTimer(5 * 60 * 1000, async () => {
    try { await logout(); } finally { router.replace('/'); }
  });

  const canAdd = addTitle.trim() && addUsername.trim() && addPassword;
  const isDuplicate = addTitle.trim() && items.some(i => i.title.toLowerCase().trim() === addTitle.trim().toLowerCase());

  // Inactivity timer handled by hook; call onAnyInteraction() in handlers
  useEffect(() => {
    (async () => {
      try {
        const avail = await canUseBiometrics();
        setBioAvailable(avail);
        setBioEnabled(user?.email ? await hasBiometricForEmail(user.email) : false);
      } catch {}
    })();
  }, []);

  // Log folders whenever they change, to confirm UI sees updates after import
  useEffect(() => {
    console.log('Folders in UI after update:', folders);
  }, [folders]);

  // Encrypt JSON with current derivedKey and show as text for copy/save
  const exportVault = async () => {
    try {
      if (!derivedKey) return Alert.alert('Not ready', 'Please log in first.');
      const payload = buildBackupPayload({ userEmail: user?.email, folders, items });
      const enc = encryptBackupJson(derivedKey, payload);
      // Save encrypted blob in AsyncStorage
      await AsyncStorage.setItem('vault_encrypted_blob', enc);
      setExportBlob(enc);
      setShowExportModal(true);
    } catch (e) {
      console.warn('Export failed', e);
      Alert.alert('Export failed', 'Could not create backup');
    }
  };

  // Paste encrypted text, decrypt with derivedKey, and import entries
  const importEncryptedBackup = async () => {
    if (!derivedKey) return Alert.alert('Not ready', 'Please log in first.');
    setImportBlob('');
    setShowImportModal(true);
  };

  // Handle import process: decrypt and merge backup data
  const importVault = async () => {
    console.log("Folders state before importing:", folders);
    try {
      const data = decryptBackupString(derivedKey, importBlob);
      console.log("🔥 Import using mergeBackupData");
      console.log("Folders state before importing:", folders);
      console.log("Decrypted backup payload:", JSON.stringify(data, null, 2));

      const { added, skipped, currentFolders, folderMapping } = await mergeBackupData(data, { items, folders, addFolder, addItemsBulk });
      //setFolders(currentFolders);

      //console.log("Folders state after importing:", folders);

      //console.log("📁 Final folder mapping2:", Array.from(folderMap.entries()));
      if (added === 0) {
        Alert.alert('Import completed', 'No new entries to import (all entries already exist)');
      } else {
        Alert.alert('Import completed', `Imported ${added} new entries (${skipped} duplicates skipped)`);
      }
      setShowImportModal(false);
    } catch (e) {
      Alert.alert('Import failed', 'Invalid or wrong key');
    }
  };

  // Add handled via modal now

  // RENDER: single entry item as a component for clarity
  const renderItem = ({ item }) => {
    const isVisible = !!visiblePasswords[item.id];
    return (
      <EntryItem
        item={item}
        isPasswordVisible={isVisible}
        onToggleVisible={() => setVisiblePasswords((v) => ({ ...v, [item.id]: !v[item.id] }))}
        onCopy={() => copyToClipboard(item.password)}
        onEdit={() => {
          setEditing(item);
          setEditTitle(item.title);
          setEditUsername(item.username);
          setEditPassword(item.password);
          setEditShowPassword(false);
          setEditFolderId(item.folderId ?? null);
        }}
        onDelete={() => removeItem(item.id)}
        styles={styles}
        since={since}
      />
    );
  };

  return (
    <View style={styles.container} onTouchStart={onAnyInteraction}>
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

      {/* Search */}
      <View style={[styles.form, { paddingVertical: 10, paddingHorizontal: 12 }]}>
        <TextInput
          placeholder="Search interface"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={(t) => { setSearch(t); onAnyInteraction(); }}
          onKeyPress={onAnyInteraction}
          style={styles.input}
        />
      </View>

      {/* Folder controls */}
      <View style={[styles.form, { marginTop: -4 }] }>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[styles.secondaryBtn, selectedFolder == null && { backgroundColor: '#16a34a' }]} onPress={() => setSelectedFolder(null)}>
            <Text style={{ color: 'white', fontWeight: '700' }}>All</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flexGrow: 0 }} onScrollBeginDrag={onAnyInteraction} onMomentumScrollBegin={onAnyInteraction}>
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
  data={items
    .filter((i) => !selectedFolder || i.folderId === selectedFolder)
    .filter((i) => !search.trim() || i.title.toLowerCase().includes(search.trim().toLowerCase()))}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>No passwords yet. Tap "Add Entry".</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScrollBeginDrag={onAnyInteraction}
        onMomentumScrollBegin={onAnyInteraction}
      />

      <Modal animationType="slide" visible={!!editing} transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            <TextInput placeholder="Interface / Company / Source" placeholderTextColor="#9ca3af" style={styles.input} value={editTitle} onChangeText={(t) => { setEditTitle(t); onAnyInteraction(); }} onKeyPress={onAnyInteraction} />
            <TextInput placeholder="Username" placeholderTextColor="#9ca3af" style={styles.input} value={editUsername} onChangeText={(t) => { setEditUsername(t); onAnyInteraction(); }} onKeyPress={onAnyInteraction} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!editShowPassword}
                  value={editPassword}
                  onChangeText={(t) => { setEditPassword(t); onAnyInteraction(); }}
                  onKeyPress={onAnyInteraction}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
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
                await updateItem({ id: editing.id, title: editTitle.trim(), username: editUsername.trim(), password: editPassword, folderId: editFolderId });
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
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Add Entry</Text>
            <TextInput placeholder="Interface / Company / Source" placeholderTextColor="#9ca3af" style={styles.input} value={addTitle} onChangeText={(t) => { setAddTitle(t); onAnyInteraction(); }} onKeyPress={onAnyInteraction} />
            <TextInput placeholder="Username" placeholderTextColor="#9ca3af" style={styles.input} value={addUsername} onChangeText={(t) => { setAddUsername(t); onAnyInteraction(); }} onKeyPress={onAnyInteraction} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!addShowPassword}
                  value={addPassword}
                  onChangeText={(t) => { setAddPassword(t); onAnyInteraction(); }}
                  onKeyPress={onAnyInteraction}
                />
                <TouchableOpacity
                  onPress={() => setAddShowPassword((v) => !v)}
                  accessibilityLabel={addShowPassword ? 'Hide password' : 'Show password'}
                  style={styles.eyeBtn}
                >
                  <Feather name={addShowPassword ? 'eye' : 'eye-off'} size={20} color="#cbd5e1" style={{ opacity: 0.7 }} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => copyToClipboard(addPassword, 'Password copied to clipboard')}
                  accessibilityLabel="Copy password"
                  style={[styles.eyeBtn, { right: 36 }]} // visually offset from eye icon
                >
                  <Feather name="copy" size={20} color="#cbd5e1" style={{ opacity: 0.7 }} />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
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
            {isDuplicate && <Text style={styles.error}>Entry already exists</Text>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity 
                style={[styles.addBtn, { flex: 1 }, (!canAdd || isDuplicate) && { opacity: 0.5 }]} 
                disabled={!canAdd || isDuplicate} 
                onPress={async () => {
                  await addItem({ title: addTitle.trim(), username: addUsername.trim(), password: addPassword, folderId: addFolderId });
                  setShowAddModal(false);
                  setAddTitle('');
                  setAddUsername('');
                  setAddPassword('');
                  setAddShowPassword(false);
                }}
              >
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
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Manage Folders</Text>
            {/* Create new folder inside Manage modal */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="New folder name"
                placeholderTextColor="#9ca3af"
                style={[styles.input, { flex: 1 }]}
                value={newFolderName}
                onChangeText={(t) => { setNewFolderName(t); onAnyInteraction(); }}
                onKeyPress={onAnyInteraction}
              />
              <TouchableOpacity
                style={[styles.secondaryBtn, !newFolderName.trim() && { opacity: 0.5 }]} 
                disabled={!newFolderName.trim()} 
                onPress={async () => {
                  const n = newFolderName.trim();
                  if (!n) return;
                  const exists = folders.some(f => f.name.trim().toLowerCase() === n.toLowerCase());
                  if (exists) {
                    Alert.alert('Duplicate Folder', `A folder named "${n}" already exists.`);
                    return;
                  }
                  const id = await addFolder(n);
                  setSelectedFolder(id);
                  setNewFolderName('');
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} onScrollBeginDrag={onAnyInteraction} onMomentumScrollBegin={onAnyInteraction}>
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
                          onChangeText={(t) => { setRenameText(t); onAnyInteraction(); }}
                          onKeyPress={onAnyInteraction}
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
                              Alert.alert('Delete folder', `Delete folder "${f.name}"? Items will be moved to All.`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: async () => { await removeFolder(f.id); if (selectedFolder === f.id) setSelectedFolder(null); } },
                              ]);
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

      {/* Export modal (text-based) */}
      <Modal animationType="slide" visible={showExportModal} transparent onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Encrypted Backup</Text>
            <Text style={{ color: '#cbd5e1' }}>Copy this text and save it somewhere safe.</Text>
            <ScrollView style={{ maxHeight: 240, marginTop: 8 }} onScrollBeginDrag={onAnyInteraction} onMomentumScrollBegin={onAnyInteraction}>
              <Text selectable style={{ color: '#e5e7eb' }}>{exportBlob}</Text>
            </ScrollView>
            {/* Export clarification */}
            <Text style={{ color: '#fca5a5', marginBottom: 8, textAlign: 'center' }}>
              You can restore your vault on another device only if you use the same username and password you registered with. If you lose your credentials, your vault cannot be recovered.
            </Text>
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

      {/* Import modal (paste text) */}
      <Modal animationType="slide" visible={showImportModal} transparent onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Paste Encrypted Backup</Text>
            <TextInput
              placeholder="Paste encrypted text here"
              placeholderTextColor="#9ca3af"
              multiline
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]}
              value={importBlob}
              onChangeText={(t) => { setImportBlob(t); onAnyInteraction(); }}
              onKeyPress={onAnyInteraction}
            />
            {/* Import clarification */}
            <Text style={{ color: '#fca5a5', marginBottom: 8, textAlign: 'center' }}>
              To import a vault backup, you must use the same username and password you originally registered with. If your credentials do not match, import will fail and your vault cannot be restored.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.addBtn, { flex: 1 }]}
                onPress={importVault}
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
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Actions</Text>
            {bioAvailable && (
              bioEnabled ? (
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={async () => { 
                  try { 
                    await disableBiometricForUser(user.email); 
                    setBioEnabled(false); 
                    Alert.alert('Success', 'Fingerprint disabled');
                  } catch {} finally { setShowActions(false); } 
                }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Disable Fingerprint</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.secondaryBtn]} onPress={async () => { 
                  try { 
                    if (derivedKey) { 
                      await enableBiometricForUser(user.email, derivedKey); 
                      setBioEnabled(true); 
                      Alert.alert('Success', 'Fingerprint enabled');
                    } 
                  } catch {} finally { setShowActions(false); } 
                }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Enable Fingerprint</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setShowActions(false); exportVault(); }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Export Vault</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => { setShowActions(false); importEncryptedBackup(); }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Import Vault</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: '#fbbf24' }]} onPress={async () => { setShowActions(false); await logout(); router.replace('/'); }}>
              <Text style={{ color: '#1f2937', fontWeight: '700' }}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => { setShowActions(false); setDeletePwd(''); setShowDeleteModal(true); }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Delete account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteBtn]} onPress={() => setShowActions(false)}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account modal (typed password only) */}
      <Modal animationType="slide" visible={showDeleteModal} transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalBackdrop} onTouchStart={onAnyInteraction}>
          <View style={styles.modalCard} onTouchStart={onAnyInteraction}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={{ color: '#fca5a5' }}>This will permanently delete your local account and vault. This cannot be undone.</Text>
            <TextInput
              placeholder="Type your account password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.input}
              value={deletePwd}
              onChangeText={(t) => { setDeletePwd(t); onAnyInteraction(); }}
              onKeyPress={onAnyInteraction}
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
                    router.replace('/');
                  } catch (e) {
                    Alert.alert('Delete failed', e.message || 'Wrong password');
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
// Styles and helpers are imported from dedicated modules above

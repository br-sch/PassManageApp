import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Presentational component for a single vault entry row
// Props:
// - item: { id, title, username, password, lastChangedAt }
// - isPasswordVisible: boolean
// - onToggleVisible: () => void
// - onCopy: () => void
// - onEdit: () => void
// - onDelete: () => void
// - styles: shared style object from vaultStyles
// - since: (ts) => string
export default function EntryItem({ item, isPasswordVisible, onToggleVisible, onCopy, onEdit, onDelete, styles, since }) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>User: {item.username}</Text>
        <View style={styles.passRow}>
          <Text style={styles.cardMeta}>Pass: {isPasswordVisible ? item.password : '••••••••'}</Text>
          <TouchableOpacity
            style={styles.eyeInlineBtn}
            onPress={onToggleVisible}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={16} color="#cbd5e1" style={{ opacity: 0.8 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.eyeInlineBtn}
            onPress={onCopy}
            accessibilityLabel="Copy password"
          >
            <Feather name="copy" size={16} color="#cbd5e1" style={{ opacity: 0.8 }} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.cardMeta, { fontStyle: 'italic', color: '#9ca3af' }]}>Changed {since(item.lastChangedAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

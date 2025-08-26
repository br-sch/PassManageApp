import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

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
        <View style={[styles.passRow, { flexDirection: 'row', alignItems: 'center', minWidth: 0 }]}> 
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
            <Text
              style={[styles.cardMeta, { flex: 1, minWidth: 0, marginRight: 8, maxWidth: 140, overflow: 'hidden' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Pass: {isPasswordVisible ? item.password : '••••••••'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.eyeInlineBtn, { marginHorizontal: 2 }]}
                onPress={onToggleVisible}
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={16} color="#cbd5e1" style={{ opacity: 0.8 }} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.eyeInlineBtn, { marginHorizontal: 2 }]}
                onPress={onCopy}
                accessibilityLabel="Copy password"
              >
                <Feather name="copy" size={16} color="#cbd5e1" style={{ opacity: 0.8 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Text style={[styles.cardMeta, { fontStyle: 'italic', color: '#9ca3af' }]}>Changed {since(item.lastChangedAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
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

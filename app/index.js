import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { generatePassword } from './lib/password';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

export default function AuthScreen() {
  const { login, register, user, loading, biometricUnlock, hasBiometricForEmail, canUseBiometrics } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canBio, setCanBio] = useState(false);
  const [hasBio, setHasBio] = useState(false);

  React.useEffect(() => {
    if (!loading && user?.email) router.replace('/vault');
  }, [loading, user]);

  React.useEffect(() => {
    (async () => {
      try {
  setCanBio(await canUseBiometrics());
  setHasBio(email ? await hasBiometricForEmail(email.trim()) : false);
      } catch {}
    })();
  }, [email]);

  const onSubmit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (isRegister) await register(email.trim(), password);
      else await login(email.trim(), password);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'light'} />
      <View style={styles.brandRow}>
        <Image source={require('../assets/icon.png')} style={styles.brandIcon} accessibilityLabel="App icon" />
        <Text style={styles.title}>Vaulton</Text>
      </View>
      <Text style={styles.subtitle}>{isRegister ? 'Create your account' : 'Welcome to the vault'}</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Username"
          placeholderTextColor="#9ca3af"
          keyboardType="default"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
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
          {isRegister && (
            <TouchableOpacity
              style={styles.genBtn}
              onPress={() => setPassword(generatePassword(16))}
              accessibilityLabel="Generate strong password"
            >
              <Text style={styles.genBtnText}>Generate</Text>
            </TouchableOpacity>
          )}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? 'Please wait…' : (isRegister ? 'Sign up' : 'Log in')}</Text>
        </TouchableOpacity>
    {Platform.OS !== 'web' && canBio && hasBio && !isRegister && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#2563eb' }]}
            onPress={async () => {
              setError('');
      try { await biometricUnlock(email.trim()); } catch (e) { setError(e.message || 'Fingerprint unlock failed'); }
            }}
          >
            <Text style={[styles.primaryBtnText, { color: '#dbeafe' }]}>Unlock with fingerprint</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setIsRegister((v) => !v)}>
          <Text style={styles.link}>{isRegister ? 'Have an account? Log in' : "New here? Create an account"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Your passwords are stored locally on this device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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

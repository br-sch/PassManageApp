// AuthScreen
// Responsibilities:
// - Login/Register with local-only account
// - Optional biometric unlock if previously enabled
// - Dark-themed UI using extracted styles
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { generatePassword } from './lib/password';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { authStyles as styles } from './styles/authStyles';

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
        {Platform.OS !== 'web' && canBio && !isRegister && (
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

// styles are imported from ./styles/authStyles

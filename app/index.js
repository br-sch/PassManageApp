import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function AuthScreen() {
  const { login, register, user, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!loading && user?.email) router.replace('/vault');
  }, [loading, user]);

  const onSubmit = async () => {
    setError('');
    try {
      if (isRegister) await register(email.trim(), password);
      else await login(email.trim(), password);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'light'} />
      <Text style={styles.title}>PassManage</Text>
      <Text style={styles.subtitle}>{isRegister ? 'Create your account' : 'Welcome back'}</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit}>
          <Text style={styles.primaryBtnText}>{isRegister ? 'Sign up' : 'Log in'}</Text>
        </TouchableOpacity>
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
  title: { color: 'white', fontSize: 36, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#cbd5e1', fontSize: 16, marginBottom: 24 },
  form: { width: '100%', maxWidth: 420, backgroundColor: '#111827', borderRadius: 16, padding: 20, gap: 12 },
  input: { backgroundColor: '#1f2937', color: 'white', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  primaryBtn: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#052e16', fontWeight: '700', fontSize: 16 },
  link: { color: '#93c5fd', textAlign: 'center', marginTop: 10 },
  error: { color: '#fca5a5', textAlign: 'center' },
  footer: { color: '#94a3b8', marginTop: 20, fontSize: 12 },
});

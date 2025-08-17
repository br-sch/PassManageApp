import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <VaultProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="vault" options={{ title: 'My Vault' }} />
          </Stack>
        </VaultProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

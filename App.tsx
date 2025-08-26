/**
 * App.tsx
 *
 * Entry point for the Vaulton React Native application.
 *
 * Purpose:
 * - Sets up global providers for authentication and vault state.
 * - Configures navigation between Auth and Vault screens using React Navigation.
 * - Applies safe area and status bar theming based on system color scheme.
 * - Disables RTL layout for consistent UI.
 *
 * Usage:
 * - This file is the root component, rendered by the native app launcher.
 * - All screens and context providers are composed here.
 *
 * Notes:
 * - See ./app/index for AuthScreen and ./app/vault for VaultScreen implementations.
 * - Providers (AuthProvider, VaultProvider) manage authentication and encrypted vault data.
 * - NavigationContainer and Stack.Navigator handle screen transitions.
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from './app/index';
import VaultScreen from './app/vault';
import { AuthProvider } from './app/context/AuthContext';
import { VaultProvider } from './app/context/VaultContext';
import { I18nManager } from 'react-native';

const Stack = createNativeStackNavigator();

I18nManager.forceRTL(false);
I18nManager.allowRTL(false);

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <VaultProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="Vault" component={VaultScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </VaultProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

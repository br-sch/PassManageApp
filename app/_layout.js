/**
 * _layout.js
 *
 * This file defines the root layout for navigation in the app.
 *
 * Usage:
 * - Used primarily in Expo projects with Expo Router to set up the navigation stack and context providers.
 * - Provides global context (AuthProvider, VaultProvider) and navigation structure for all screens.
 * - Ensures RTL layout is disabled for consistent UI.
 *
 * Note:
 * - This file is not used in vanilla React Native projects; it is specific to Expo Router conventions.
 * - All screens are rendered within the providers and navigation container defined here.
 */
import React from 'react';
import { I18nManager } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

I18nManager.forceRTL(false);
I18nManager.allowRTL(false);

const Stack = createStackNavigator();

export default function RootLayout() {
  React.useEffect(() => {
    if (typeof I18nManager !== 'undefined' && I18nManager.isRTL) {
      I18nManager.forceRTL(false);
      I18nManager.allowRTL(false);
    }
  }, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <VaultProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="vault" options={{ title: 'My Vault' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </VaultProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Anton_400Regular,
} from '@expo-google-fonts/anton';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Constants from 'expo-constants';
import { PaystackProvider } from 'react-native-paystack-webview';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PAYSTACK_PUBLIC_KEY as ENV_PAYSTACK_PUBLIC_KEY } from '@env';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import theme from './src/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const resolvePaystackKey = () => {
  const configKey =
    Constants?.expoConfig?.extra?.paystackPublicKey ??
    Constants?.manifest?.extra?.paystackPublicKey ??
    '';
  return ENV_PAYSTACK_PUBLIC_KEY || configKey || '';
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const paystackPublicKey = resolvePaystackKey();

  let [fontsLoaded] = useFonts({
    Anton_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any other resources or data here
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    if (fontsLoaded) {
      prepare();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white }}>
        <ActivityIndicator size="large" color={theme.colors.orange} />
      </View>
    );
  }

  return (
    <PaystackProvider publicKey={paystackPublicKey} currency="NGN" defaultChannels={['card', 'bank']}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </PaystackProvider>
  );
}

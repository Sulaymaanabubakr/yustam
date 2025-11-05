import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

// Screens
import SplashScreen from '../screens/shared/SplashScreen';
import OnboardingScreen from '../screens/shared/OnboardingScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import MainTabNavigator from './MainTabNavigator';

// Vendor Screens
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import AnalyticsScreen from '../screens/vendor/AnalyticsScreen';
import BillingHistoryScreen from '../screens/vendor/BillingHistoryScreen';
import VendorNotificationsScreen from '../screens/vendor/VendorNotificationsScreen';
import HelpSupportScreen from '../screens/vendor/HelpSupportScreen';
import StorefrontScreen from '../screens/vendor/StorefrontScreen';
import SettingsScreen from '../screens/vendor/SettingsScreen';
import VendorListingsScreen from '../screens/vendor/VendorListingsScreen';
import ListingEditorScreen from '../screens/vendor/ListingEditorScreen';
import EditProfileScreen from '../screens/vendor/EditProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      setHasSeenOnboarding(onboardingComplete === 'true');
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (authLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            {!hasSeenOnboarding && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Vendor Screens */}
            <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="BillingHistory" component={BillingHistoryScreen} />
            <Stack.Screen name="VendorNotifications" component={VendorNotificationsScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="Storefront" component={StorefrontScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="VendorListings" component={VendorListingsScreen} />
            <Stack.Screen name="ListingEditor" component={ListingEditorScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

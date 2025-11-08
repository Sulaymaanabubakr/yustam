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
import BuyerFlashSaleScreen from '../screens/buyer/FlashSaleScreen';
import BuyerProductDetailScreen from '../screens/buyer/ProductDetailScreen';
import BuyerSupportScreen from '../screens/buyer/SupportScreen';
import BuyerCartScreen from '../screens/buyer/CartScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

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
import VendorChatsScreen from '../screens/vendor/VendorChatsScreen';
import PlansScreen from '../screens/vendor/PlansScreen';
import SubscriptionDetailsScreen from '../screens/vendor/SubscriptionDetailsScreen';
import VerificationScreen from '../screens/vendor/VerificationScreen';
import ChatThreadScreen from '../screens/vendor/ChatThreadScreen';

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
            <Stack.Screen name="BuyerFlashSale" component={BuyerFlashSaleScreen} />
            <Stack.Screen name="BuyerProductDetail" component={BuyerProductDetailScreen} />
            <Stack.Screen name="BuyerSupport" component={BuyerSupportScreen} />
            <Stack.Screen name="BuyerCart" component={BuyerCartScreen} />
            <Stack.Screen name="BuyerNotifications" component={NotificationsScreen} />
            
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
            <Stack.Screen name="VendorChats" component={VendorChatsScreen} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
            <Stack.Screen name="Plans" component={PlansScreen} />
            <Stack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

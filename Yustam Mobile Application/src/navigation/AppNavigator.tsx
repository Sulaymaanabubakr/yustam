import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import BuyerTabNavigator from './BuyerTabNavigator';
import VendorTabNavigator from './VendorTabNavigator';
import { hasOnboarded, getUserRole } from '../services/storage';
import { getCurrentUser } from '../services/firebase';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'buyer' | 'vendor'>('buyer');

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    // Check onboarding status
    const onboarded = await hasOnboarded();
    setHasCompletedOnboarding(onboarded);

    // Check authentication
    const user = getCurrentUser();
    setIsAuthenticated(!!user);

    // Get user role
    const role = await getUserRole();
    if (role) {
      setUserRole(role);
    }

    setIsLoading(false);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleOnboardingComplete = (role: 'buyer' | 'vendor') => {
    setUserRole(role);
    setHasCompletedOnboarding(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth">
            {() => <AuthScreen onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        ) : userRole === 'buyer' ? (
          <Stack.Screen name="BuyerMain">
            {() => <BuyerTabNavigator onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="VendorMain">
            {() => <VendorTabNavigator onLogout={handleLogout} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

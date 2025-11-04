import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import BuyerTabNavigator from './BuyerTabNavigator';
import VendorTabNavigator from './VendorTabNavigator';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, userRole, loading, hasSeenOnboarding } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  if (loading || showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not authenticated
          <>
            {!hasSeenOnboarding ? (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : null}
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          // Authenticated - show appropriate dashboard
          <>
            {userRole === 'vendor' ? (
              <Stack.Screen name="VendorMain" component={VendorTabNavigator} />
            ) : (
              <Stack.Screen name="BuyerMain" component={BuyerTabNavigator} />
            )}
          </>
        )}
        <Stack.Screen name="Splash" component={SplashScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

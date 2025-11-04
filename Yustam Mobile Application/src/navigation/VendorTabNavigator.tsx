import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import VendorHomeScreen from '../screens/vendor/VendorHomeScreen';
import ChatScreen from '../screens/buyer/ChatScreen';
import VendorListingsScreen from '../screens/vendor/VendorListingsScreen';
import ProfileScreen from '../screens/buyer/ProfileScreen';
import VendorSettingsScreen from '../screens/vendor/VendorSettingsScreen';

const Tab = createBottomTabNavigator();

interface VendorTabNavigatorProps {
  onLogout: () => void;
}

const VendorTabNavigator: React.FC<VendorTabNavigatorProps> = ({ onLogout }) => {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.orange,
          tabBarInactiveTintColor: COLORS.gray500,
          tabBarStyle: {
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: FONT_SIZES.xs,
            fontWeight: '600',
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={VendorHomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Chats"
          component={ChatScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Listings"
          component={VendorListingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pricetag" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        >
          {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        >
          {() => <VendorSettingsScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>

      <TouchableOpacity
        style={styles.floatingButton}
        accessibilityRole="button"
        accessibilityLabel="Create listing"
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
});

export default VendorTabNavigator;

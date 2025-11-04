import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
    <View style={{ flex: 1 }}>
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
            tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
          }}
        />
        <Tab.Screen
          name="Chats"
          component={ChatScreen}
          options={{
            tabBarIcon: ({ color }) => <TabIcon icon="💬" color={color} />,
          }}
        />
        <Tab.Screen
          name="Listings"
          component={VendorListingsScreen}
          options={{
            tabBarIcon: ({ color }) => <TabIcon icon="📦" color={color} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
          }}
        >
          {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          options={{
            tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} />,
          }}
        >
          {() => <VendorSettingsScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const TabIcon: React.FC<{ icon: string; color: string }> = ({ icon }) => {
  return <Text style={{ fontSize: 24 }}>{icon}</Text>;
};

const styles = StyleSheet.create({
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
  floatingButtonText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default VendorTabNavigator;

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import BuyerHomeScreen from '../screens/buyer/BuyerHomeScreen';
import BuyerSearchScreen from '../screens/buyer/BuyerSearchScreen';
import BuyerChatScreen from '../screens/buyer/BuyerChatScreen';
import BuyerNotificationsScreen from '../screens/buyer/BuyerNotificationsScreen';
import BuyerProfileScreen from '../screens/buyer/BuyerProfileScreen';

const Tab = createBottomTabNavigator();

const BuyerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F3731E',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={BuyerHomeScreen} />
      <Tab.Screen name="Search" component={BuyerSearchScreen} />
      <Tab.Screen name="Chat" component={BuyerChatScreen} />
      <Tab.Screen name="Notifications" component={BuyerNotificationsScreen} />
      <Tab.Screen name="Profile" component={BuyerProfileScreen} />
    </Tab.Navigator>
  );
};

export default BuyerTabNavigator;

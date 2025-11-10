import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import theme from '../theme';
import { USER_ROLES } from '../config/constants';

// Screens
import BuyerHomeScreen from '../screens/buyer/HomeScreen';
import BuyerSearchScreen from '../screens/buyer/SearchScreen';
import BuyerSavedScreen from '../screens/buyer/SavedScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import BuyerProfileScreen from '../screens/buyer/BuyerProfileScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorListingsScreen from '../screens/vendor/VendorListingsScreen';
import VendorChatsScreen from '../screens/vendor/VendorChatsScreen';
import VendorNotificationsScreen from '../screens/vendor/VendorNotificationsScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { role } = useAuth();
  const isVendor = role === USER_ROLES.VENDOR;

  const buyerTabBarStyle = {
    backgroundColor: theme.colors.white,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 82 : 76,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  };

  const vendorTabBarStyle = {
    backgroundColor: theme.colors.white,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 80 : 74,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  };

  const getIconName = (routeName, focused) => {
    switch (routeName) {
      case 'Home':
        return focused ? 'home' : 'home-outline';
      case 'Search':
      case 'BuyerSearch':
        return focused ? 'bag' : 'bag-outline';
      case 'Chat':
      case 'VendorChats':
        return focused ? 'chatbubbles' : 'chatbubbles-outline';
      case 'Notifications':
      case 'VendorNotifications':
        return focused ? 'notifications' : 'notifications-outline';
      case 'BuyerSaved':
        return focused ? 'bookmark' : 'bookmark-outline';
      case 'Profile':
        return focused ? 'person' : 'person-outline';
      case 'VendorDashboard':
        return focused ? 'speedometer' : 'speedometer-outline';
      case 'VendorListings':
        return focused ? 'albums' : 'albums-outline';
      default:
        return focused ? 'ellipse' : 'ellipse-outline';
    }
  };

  return (
    <Tab.Navigator
      initialRouteName={isVendor ? 'VendorDashboard' : 'Home'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={getIconName(route.name, focused)} size={size} color={color} />
        ),
        tabBarActiveTintColor: theme.colors.orange,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: isVendor ? vendorTabBarStyle : buyerTabBarStyle,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.interMedium,
          fontSize: theme.typography.fontSize.xs,
        },
        tabBarItemStyle: {
          marginHorizontal: 6,
        },
      })}
      sceneContainerStyle={{ backgroundColor: isVendor ? theme.colors.background : theme.colors.backgroundLight }}
    >
      {isVendor ? (
        <>
          <Tab.Screen
            name="VendorDashboard"
            component={VendorDashboardScreen}
            options={{ tabBarLabel: 'Dashboard' }}
          />
          <Tab.Screen
            name="VendorListings"
            component={VendorListingsScreen}
            options={{ tabBarLabel: 'Listings' }}
          />
          <Tab.Screen
            name="VendorChats"
            component={VendorChatsScreen}
            options={{ tabBarLabel: 'Chats' }}
          />
          <Tab.Screen
            name="VendorNotifications"
            component={VendorNotificationsScreen}
            options={{ tabBarLabel: 'Alerts' }}
          />
          <Tab.Screen name="Profile" component={VendorProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={BuyerHomeScreen} />
          <Tab.Screen
            name="BuyerSearch"
            component={BuyerSearchScreen}
            options={{ tabBarLabel: 'Shop' }}
          />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen
            name="BuyerSaved"
            component={BuyerSavedScreen}
            options={{ tabBarLabel: 'Saved' }}
          />
          <Tab.Screen name="Profile" component={BuyerProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

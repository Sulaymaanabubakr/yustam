import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { getUserRole } from '../../services/storage';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [userRole, setUserRole] = useState<'buyer' | 'vendor'>('buyer');

  React.useEffect(() => {
    // Get user role from storage
    getUserRole().then((role) => {
      if (role) setUserRole(role);
    });
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>YUSTAM</Text>
          <Text style={styles.subtitle}>
            {userRole === 'vendor' ? 'Vendor Portal' : 'Welcome Back'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'login' && styles.activeTab]}
            onPress={() => setActiveTab('login')}
          >
            <Text
              style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}
            >
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'register' && styles.activeTab]}
            onPress={() => setActiveTab('register')}
          >
            <Text
              style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          {activeTab === 'login' ? (
            <LoginForm userRole={userRole} onSuccess={onAuthSuccess} />
          ) : (
            <RegisterForm userRole={userRole} onSuccess={onAuthSuccess} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xxl * 2,
    marginBottom: SPACING.xl,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.emerald,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray600,
    marginTop: SPACING.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  activeTabText: {
    color: COLORS.emerald,
  },
  formContainer: {
    flex: 1,
  },
});

export default AuthScreen;

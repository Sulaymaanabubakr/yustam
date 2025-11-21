import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import { hasGoogleOAuthConfig, configureGoogleSignIn, fetchGoogleIdToken } from '../../config/googleAuth';

const LoginForm = ({ navigation }) => {
  const { login, signInWithGoogle, role: currentRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const storedRole = await AsyncStorage.getItem('role');
      const role = storedRole || 'buyer';

      await login(email.trim(), password, role);
      showToast('Login successful!', 'success');

      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 500);
    } catch (error) {
      const message = error?.message || 'Unable to login. Please try again.';
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleButtonPress = async () => {
    if (googleLoading) {
      return;
    }

    if (!hasGoogleOAuthConfig()) {
      showToast('Google sign-in is not configured. Please contact support.');
      return;
    }

    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      if (Platform.OS === 'android') {
        await GoogleSignin.signOut().catch(() => undefined);
      }
      const account = await GoogleSignin.signIn();
      const idToken = await fetchGoogleIdToken(account);

      if (!idToken) {
        throw new Error('Unable to retrieve Google credentials. Please try again.');
      }

      const storedRole = await AsyncStorage.getItem('role');
      const targetRole = storedRole || currentRole || 'buyer';
      await signInWithGoogle(idToken, targetRole);
      showToast('Login successful!', 'success');
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 500);
    } catch (error) {
      console.error('Google login error:', error);
      let message = 'Google sign-in failed. Please try again.';
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        message = 'Google sign-in was cancelled.';
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        message = 'Google sign-in is already in progress.';
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        message = 'Google Play Services is unavailable. Please update it and try again.';
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
      showToast(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />

      <Input
        label="Email Address"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.email) setErrors({ ...errors, email: null });
        }}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        icon="mail-outline"
        error={errors.email}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors({ ...errors, password: null });
        }}
        placeholder="Enter your password"
        secureTextEntry
        icon="lock-closed-outline"
        error={errors.password}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotPassword}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <Button
        onPress={handleLogin}
        variant="primary"
        size="large"
        fullWidth
        loading={loading}
        disabled={loading}
      >
        Login
      </Button>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
        onPress={handleGoogleButtonPress}
        activeOpacity={0.8}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <>
            <ActivityIndicator size="small" color={theme.colors.orange} />
            <Text style={styles.googleButtonText}>Signing in...</Text>
          </>
        ) : (
          <>
            <Image
              source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.base,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: theme.spacing.xs,
  },
  forgotPasswordText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.orange,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    ...theme.shadows.soft,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
});

export default LoginForm;

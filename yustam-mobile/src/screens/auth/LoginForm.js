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
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import {
  GOOGLE_OAUTH_CONFIG,
  GOOGLE_OAUTH_SCOPES,
  hasGoogleOAuthConfig,
} from '../../config/googleAuth';

const LoginForm = ({ navigation }) => {
  const { login, signInWithGoogle, role: currentRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const nativeRedirectUri = Platform.select({
    android: 'com.googleusercontent.apps.90080814337-3k0s5u9pne7i5vnfgalu5sddj8uc9jj3:/oauthredirect',
    ios: 'com.googleusercontent.apps.90080814337-adt11pru8ka1b5adl5q381iolbjrsj93:/oauthredirect',
    default: undefined,
  });

  const redirectUri = makeRedirectUri({
    scheme: 'yustam',
    native: nativeRedirectUri,
    useProxy: false,
  });
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_OAUTH_CONFIG.expoClientId,
    iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
    androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
    webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
    responseType: 'id_token',
    scopes: GOOGLE_OAUTH_SCOPES,
    selectAccount: true,
    redirectUri,
  });

  const showToast = useCallback((message, type = 'error') => {
    setToast({ visible: true, message, type });
  }, [setToast]);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, [setToast]);

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
      // Get the role from AsyncStorage
      const storedRole = await AsyncStorage.getItem('role');
      const role = storedRole || 'buyer';

      await login(email.trim(), password, role);
      showToast('Login successful!', 'success');
      
      // Navigate to main app
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

  useEffect(() => {
    if (!response) {
      return;
    }

    const handleGoogleResponse = async () => {
      if (response.type === 'success') {
        const idToken =
          response.authentication?.idToken || response.params?.id_token || null;

        if (!idToken) {
          showToast('Unable to retrieve Google credentials. Please try again.');
          setGoogleLoading(false);
          return;
        }

        try {
          const storedRole = await AsyncStorage.getItem('role');
          const targetRole = storedRole || currentRole || 'buyer';
          await signInWithGoogle(idToken, targetRole);
          showToast('Login successful!', 'success');
          setTimeout(() => {
            navigation.replace('MainTabs');
          }, 500);
        } catch (error) {
          console.error('Google login error:', error);
          const message = error instanceof Error ? error.message : 'Google sign-in failed. Please try again.';
          showToast(message);
        } finally {
          setGoogleLoading(false);
        }
        return;
      }

      if (response.type === 'error') {
        const message = response.error?.message || 'Google sign-in failed. Please try again.';
        showToast(message);
      }

      setGoogleLoading(false);
    };

    handleGoogleResponse();
  }, [response, currentRole, navigation, showToast, signInWithGoogle]);

  const handleGoogleButtonPress = async () => {
    if (!hasGoogleOAuthConfig()) {
      showToast('Google sign-in is not configured. Please contact support.');
      return;
    }

    if (!request) {
      showToast('Google sign-in is preparing. Please try again in a moment.');
      return;
    }

    if (googleLoading) {
      return;
    }

    setGoogleLoading(true);

    try {
      await promptAsync({
        useProxy: false,
        showInRecents: true,
        redirectUri,
      });
    } catch (error) {
      console.error('Google prompt error:', error);
      showToast('Unable to start Google sign-in. Please try again.');
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
        style={[styles.googleButton, (!request || googleLoading) && styles.googleButtonDisabled]}
        onPress={handleGoogleButtonPress}
        activeOpacity={0.8}
        disabled={!request || googleLoading}
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

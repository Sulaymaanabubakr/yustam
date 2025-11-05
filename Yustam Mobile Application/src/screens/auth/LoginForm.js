import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Toast from '../../components/Toast';

const LoginForm = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

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
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // TODO: Implement Google Sign-In with expo-auth-session
    showToast('Google Sign-In coming soon!', 'info');
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
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
          style={styles.googleIcon}
        />
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
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

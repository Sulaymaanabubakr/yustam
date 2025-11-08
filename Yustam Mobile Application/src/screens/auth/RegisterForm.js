import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../config/constants';
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

const RegisterForm = ({ navigation }) => {
  const { register: registerUser, signInWithGoogle, role: currentRole } = useAuth();
  const [role, setRole] = useState('buyer'); // Default role
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  
  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // Vendor-specific fields
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');

  const redirectUri = makeRedirectUri({
    scheme: 'yustam',
    useProxy: true,
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

  useEffect(() => {
    // Load role from AsyncStorage
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem('role');
      if (storedRole) {
        setRole(storedRole);
      }
    };
    loadRole();
  }, []);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ visible: true, message, type });
  }, [setToast]);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, [setToast]);

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Vendor-specific validation
    if (role === 'vendor') {
      if (!businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      }
      if (!category) {
        newErrors.category = 'Please select a category';
      }
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      showToast('Please fix the errors above');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        fullName: fullName.trim(),
        phone: phone.trim(),
      };

      if (role === 'vendor') {
        userData.businessName = businessName.trim();
        userData.category = category;
      }

      await registerUser(email.trim(), password, userData, role);
      showToast('Registration successful!', 'success');
      
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
          const targetRole = role || currentRole || 'buyer';
          await signInWithGoogle(idToken, targetRole);
          showToast('Registration successful!', 'success');
          setTimeout(() => {
            navigation.replace('MainTabs');
          }, 500);
        } catch (error) {
          console.error('Google registration error:', error);
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
  }, [response, role, currentRole, navigation, showToast, signInWithGoogle]);

  const handleGoogleSignUp = async () => {
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
        useProxy: true,
        showInRecents: true,
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
        label="Full Name"
        value={fullName}
        onChangeText={(text) => {
          setFullName(text);
          if (errors.fullName) setErrors({ ...errors, fullName: null });
        }}
        placeholder="Enter your full name"
        icon="person-outline"
        error={errors.fullName}
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
        label="Phone Number"
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          if (errors.phone) setErrors({ ...errors, phone: null });
        }}
        placeholder="08012345678"
        keyboardType="phone-pad"
        icon="call-outline"
        error={errors.phone}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors({ ...errors, password: null });
        }}
        placeholder="Create a secure password"
        secureTextEntry
        icon="lock-closed-outline"
        error={errors.password}
      />

      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
        }}
        placeholder="Re-enter your password"
        secureTextEntry
        icon="lock-closed-outline"
        error={errors.confirmPassword}
      />

      {/* Vendor-specific fields */}
      {role === 'vendor' && (
        <>
          <Input
            label="Business Name"
            value={businessName}
            onChangeText={(text) => {
              setBusinessName(text);
              if (errors.businessName) setErrors({ ...errors, businessName: null });
            }}
            placeholder="Enter your business name"
            icon="briefcase-outline"
            error={errors.businessName}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Main Category</Text>
            <View style={[styles.pickerWrapper, errors.category && styles.pickerError]}>
              <Picker
                selectedValue={category}
                onValueChange={(value) => {
                  setCategory(value);
                  if (errors.category) setErrors({ ...errors, category: null });
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select your focus category" value="" />
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>
        </>
      )}

      {/* Terms and Conditions */}
      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() => setAgreeTerms(!agreeTerms)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
          {agreeTerms && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
        <Text style={styles.termsText}>
          I agree to YUSTAM's{' '}
          <Text style={styles.termsLink}>Marketplace Policies</Text> &{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>
      {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

      <Button
        onPress={handleRegister}
        variant="primary"
        size="large"
        fullWidth
        loading={loading}
        disabled={loading}
      >
        Create Account
      </Button>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, (!request || googleLoading) && styles.googleButtonDisabled]}
        onPress={handleGoogleSignUp}
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
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
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
  pickerContainer: {
    marginBottom: theme.spacing.base,
  },
  label: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  pickerWrapper: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  pickerError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  picker: {
    height: 50,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.orange,
    borderColor: theme.colors.orange,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
  },
  termsLink: {
    color: theme.colors.orange,
    fontFamily: theme.typography.fontFamily.interSemiBold,
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

export default RegisterForm;

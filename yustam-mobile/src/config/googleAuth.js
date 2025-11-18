import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const DEFAULT_CLIENT_IDS = {
  expoClientId: '',
  iosClientId: '',
  androidClientId: '',
  webClientId: '',
};

const readExtraConfig = () => {
  try {
    const expoConfig = Constants?.expoConfig ?? Constants?.manifest ?? {};
    return expoConfig?.extra?.googleAuth ?? {};
  } catch (error) {
    console.warn('Unable to load Google OAuth config from Expo constants.', error);
    return {};
  }
};

const normalise = (value) => (typeof value === 'string' ? value.trim() : '');

const extraConfig = {
  ...DEFAULT_CLIENT_IDS,
  ...Object.entries(readExtraConfig()).reduce((acc, [key, value]) => {
    acc[key] = normalise(value);
    return acc;
  }, {}),
};

export const GOOGLE_OAUTH_CONFIG = {
  expoClientId: extraConfig.expoClientId,
  iosClientId: extraConfig.iosClientId,
  androidClientId: extraConfig.androidClientId,
  webClientId: extraConfig.webClientId,
};

export const GOOGLE_OAUTH_SCOPES = ['openid', 'profile', 'email'];

export const hasGoogleOAuthConfig = () => {
  const hasWebClient =
    typeof GOOGLE_OAUTH_CONFIG.webClientId === 'string' && GOOGLE_OAUTH_CONFIG.webClientId.length > 0;
  const hasNativeClient =
    (typeof GOOGLE_OAUTH_CONFIG.androidClientId === 'string' &&
      GOOGLE_OAUTH_CONFIG.androidClientId.length > 0) ||
    (typeof GOOGLE_OAUTH_CONFIG.iosClientId === 'string' &&
      GOOGLE_OAUTH_CONFIG.iosClientId.length > 0);
  return hasWebClient && hasNativeClient;
};

let googleSignInConfigured = false;
export const configureGoogleSignIn = () => {
  if (googleSignInConfigured) {
    return;
  }
  if (!hasGoogleOAuthConfig()) {
    console.warn('Google Sign-In cannot be configured without OAuth client IDs');
    return;
  }
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
      iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
      androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: false,
      scopes: GOOGLE_OAUTH_SCOPES,
      profileImageSize: 160,
    });
    googleSignInConfigured = true;
  } catch (error) {
    console.warn('Unable to configure native Google Sign-In', error);
  }
};

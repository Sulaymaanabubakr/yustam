import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const DEFAULT_CLIENT_IDS = {
  expoClientId: '',
  iosClientId: '',
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
  webClientId: extraConfig.webClientId,
};

export const GOOGLE_OAUTH_SCOPES = ['openid', 'profile', 'email'];

export const hasGoogleOAuthConfig = () =>
  typeof GOOGLE_OAUTH_CONFIG.webClientId === 'string' && GOOGLE_OAUTH_CONFIG.webClientId.length > 0;

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
    const config = {
      webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: false,
      scopes: GOOGLE_OAUTH_SCOPES,
      profileImageSize: 160,
    };
    if (GOOGLE_OAUTH_CONFIG.iosClientId) {
      config.iosClientId = GOOGLE_OAUTH_CONFIG.iosClientId;
    }
    GoogleSignin.configure(config);
    googleSignInConfigured = true;
  } catch (error) {
    console.warn('Unable to configure native Google Sign-In', error);
  }
};

export const fetchGoogleIdToken = async (account) => {
  if (account?.idToken) {
    return account.idToken;
  }
  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens?.idToken) {
      return tokens.idToken;
    }
  } catch (tokenError) {
    console.warn('Unable to fetch cached Google tokens', tokenError);
  }
  return null;
};

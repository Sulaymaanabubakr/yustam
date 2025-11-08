import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_CLIENT_ID = '90080814337-23s48plm9jo0o545h9m5b5c6ut8e5ami.apps.googleusercontent.com';

const readExtraConfig = () => {
  try {
    const expoConfig = Constants?.expoConfig ?? Constants?.manifest ?? {};
    return expoConfig?.extra?.googleAuth ?? {};
  } catch (error) {
    console.warn('Unable to load Google OAuth config from Expo constants.', error);
    return {};
  }
};

const extraConfig = readExtraConfig();

const normalise = (value) => (typeof value === 'string' ? value.trim() : '');

export const GOOGLE_OAUTH_CONFIG = {
  expoClientId: normalise(extraConfig.expoClientId) || FALLBACK_CLIENT_ID,
  iosClientId: normalise(extraConfig.iosClientId) || FALLBACK_CLIENT_ID,
  androidClientId: normalise(extraConfig.androidClientId) || FALLBACK_CLIENT_ID,
  webClientId: normalise(extraConfig.webClientId) || FALLBACK_CLIENT_ID,
};

export const GOOGLE_OAUTH_SCOPES = ['openid', 'profile', 'email'];

export const hasGoogleOAuthConfig = () =>
  Object.values(GOOGLE_OAUTH_CONFIG).some((value) => typeof value === 'string' && value.length > 0);

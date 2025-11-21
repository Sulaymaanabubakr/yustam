import AsyncStorage from '@react-native-async-storage/async-storage';

export const BOT_SETTINGS_STORAGE_KEY = 'yustam.bot.settings.v1';

const defaultSettings = {
  mode: 'global',
  location: {
    state: '',
    city: '',
  },
};

const normaliseString = (value) => (typeof value === 'string' ? value.trim() : '');

const normaliseLocation = (rawLocation = {}) => {
  const state = normaliseString(rawLocation.state);
  const city = normaliseString(rawLocation.city);
  return {
    state,
    city,
  };
};

export const getBotPreferences = async () => {
  try {
    const stored = await AsyncStorage.getItem(BOT_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return defaultSettings;
    }
    const parsed = JSON.parse(stored);
    const mode = ['global', 'local'].includes(parsed?.mode) ? parsed.mode : 'global';
    const location = normaliseLocation(parsed?.location);
    return {
      mode,
      location,
    };
  } catch (error) {
    console.warn('aiPreferences.getBotPreferences error:', error);
    return defaultSettings;
  }
};

export const saveBotPreferences = async (preferences = defaultSettings) => {
  const payload = {
    mode: ['global', 'local'].includes(preferences?.mode) ? preferences.mode : defaultSettings.mode,
    location: normaliseLocation(preferences?.location),
  };
  try {
    await AsyncStorage.setItem(BOT_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('aiPreferences.saveBotPreferences error:', error);
  }
};

const locationMatches = (listing = {}, preference) => {
  if (!preference || preference.mode !== 'local') {
    return true;
  }
  const target = normaliseLocation(preference.location);
  if (!target.state && !target.city) {
    return true;
  }

  const listingState = normaliseString(listing.state || listing.vendorState || listing.locationState || listing.region || '');
  const listingCity = normaliseString(listing.city || listing.vendorCity || listing.locationCity || '');
  const locationString = normaliseString(listing.location || listing.address || '');

  const matchesCity = target.city
    ? listingCity.toLowerCase() === target.city.toLowerCase() || locationString.toLowerCase().includes(target.city.toLowerCase())
    : true;
  const matchesState = target.state
    ? listingState.toLowerCase() === target.state.toLowerCase() || locationString.toLowerCase().includes(target.state.toLowerCase())
    : true;

  return matchesCity && matchesState;
};

export const filterListingsByPreference = (items = [], preference = defaultSettings) => {
  if (!Array.isArray(items) || !items.length) {
    return Array.isArray(items) ? items : [];
  }
  return items.filter((item) => locationMatches(item, preference));
};

export const describePreference = (preference = defaultSettings) => {
  if (preference.mode !== 'local') {
    return null;
  }
  const location = normaliseLocation(preference.location);
  if (!location.city && !location.state) {
    return null;
  }
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  return location.city || location.state;
};

export default {
  BOT_SETTINGS_STORAGE_KEY,
  getBotPreferences,
  saveBotPreferences,
  filterListingsByPreference,
  describePreference,
};

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'buyerNotificationsMeta';

const defaultState = {
  total: 0,
  unread: 0,
  lastFetchedAt: null,
};

export const getStoredNotificationsMeta = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
    };
  } catch (error) {
    console.warn('Failed to load notification meta', error);
    return defaultState;
  }
};

export const saveNotificationsMeta = async (meta = defaultState) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultState, ...meta }));
  } catch (error) {
    console.warn('Failed to store notification meta', error);
  }
};

export default {
  getStoredNotificationsMeta,
  saveNotificationsMeta,
};

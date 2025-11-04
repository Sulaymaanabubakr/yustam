import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: 'buyer' | 'vendor';
  businessName?: string;
  phone?: string;
  category?: string;
  photoURL?: string;
  plan?: string;
  verified?: boolean;
}

const KEYS = {
  USER_ROLE: '@yustam_user_role',
  USER_DATA: '@yustam_user_data',
  HAS_ONBOARDED: '@yustam_has_onboarded',
  AUTH_TOKEN: '@yustam_auth_token',
};

// User Role
export const saveUserRole = async (role: 'buyer' | 'vendor'): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(KEYS.USER_ROLE, role);
    return true;
  } catch (error) {
    console.error('Error saving user role:', error);
    return false;
  }
};

export const getUserRole = async (): Promise<'buyer' | 'vendor' | null> => {
  try {
    const role = await AsyncStorage.getItem(KEYS.USER_ROLE);
    return role as 'buyer' | 'vendor' | null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// User Data
export const saveUserData = async (userData: UserData): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Onboarding Status
export const setOnboardingComplete = async (): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(KEYS.HAS_ONBOARDED, 'true');
    return true;
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    return false;
  }
};

export const hasOnboarded = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.HAS_ONBOARDED);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// Clear all data (logout)
export const clearAllData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.USER_ROLE,
      KEYS.USER_DATA,
      KEYS.AUTH_TOKEN,
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};

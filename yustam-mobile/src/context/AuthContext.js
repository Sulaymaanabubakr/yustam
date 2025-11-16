import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI, vendorAPI, setApiAuthToken } from '../services/api';
import { USER_ROLES } from '../config/constants';
import resolveAuthErrorMessage from '../utils/authErrors';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const STORAGE_KEYS = {
    user: 'user',
    role: 'role',
    token: 'authToken',
    backendUser: 'backendUser',
  };

  // Load user data from AsyncStorage on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [userData, userRole, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.user),
        AsyncStorage.getItem(STORAGE_KEYS.role),
        AsyncStorage.getItem(STORAGE_KEYS.token),
      ]);

      if (token) {
        setApiAuthToken(token);
      }

      if (userData && userRole) {
        setUser(JSON.parse(userData));
        setRole(userRole);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveUserData = async (userData, userRole, backendUser = null) => {
    try {
      const mergedUser = { ...(user || {}), ...userData };
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mergedUser));
      await AsyncStorage.setItem(STORAGE_KEYS.role, userRole);
      if (backendUser) {
        await AsyncStorage.setItem(STORAGE_KEYS.backendUser, JSON.stringify(backendUser));
      }
      setUser(mergedUser);
      setRole(userRole);
      setIsAuthenticated(true);
      return mergedUser;
    } catch (error) {
      console.error('Error saving user data:', error);
      throw new Error('Failed to save user data');
    }
  };

  const clearUserData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.user,
        STORAGE_KEYS.role,
        STORAGE_KEYS.token,
        STORAGE_KEYS.backendUser,
      ]);
      setApiAuthToken(null);
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  const updateUserProfile = async (updates = {}) => {
    try {
      const nextUser = { ...(user || {}), ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      console.error('Error updating stored profile:', error);
      throw new Error('Unable to update profile locally');
    }
  };

  const composeUserProfile = (firebaseUser, backendUser, overrides = {}) => {
    const backendRole = backendUser?.role?.toLowerCase();
    return {
      uid: firebaseUser?.uid ?? overrides.uid,
      id: backendUser?.id ?? overrides.id,
      email: overrides.email ?? backendUser?.email ?? firebaseUser?.email ?? '',
      displayName: overrides.displayName ?? backendUser?.displayName ?? firebaseUser?.displayName ?? '',
      photoURL: overrides.photoURL ?? backendUser?.photoUrl ?? firebaseUser?.photoURL ?? null,
      phone: overrides.phone ?? backendUser?.phone ?? firebaseUser?.phoneNumber ?? null,
      role: overrides.role ?? backendRole ?? overrides.role,
      ...overrides,
    };
  };

  const syncBackendSession = async (firebaseUser) => {
    if (!firebaseUser) {
      throw new Error('Firebase authentication failed');
    }

    const idToken = await firebaseUser.getIdToken(true);
    console.log('Firebase ID token (copy for curl test):', idToken);

    try {
      const { data } = await authAPI.createSession(idToken);
      const backendUser = data?.user ?? data;
      const token = data?.token;

      if (!backendUser || !token) {
        throw new Error('Failed to create backend session');
      }

      setApiAuthToken(token);
      await AsyncStorage.setItem(STORAGE_KEYS.token, token);
      await AsyncStorage.setItem(STORAGE_KEYS.backendUser, JSON.stringify(backendUser));

      return { token, backendUser };
    } catch (error) {
      const status = error?.response?.status;
      const payload = error?.response?.data;
      console.error('Session error status:', status);
      console.error('Session error payload:', payload);
      console.error('Session error message:', error?.message);
      if (error?.toJSON) {
        console.error('Session error toJSON:', error.toJSON());
      } else {
        console.error('Session error raw:', error);
      }

      const fallbackMessage = payload?.message || (error instanceof Error ? error.message : null) || 'Failed to create backend session';
      const friendly = new Error(fallbackMessage);
      if (typeof status === 'number') {
        friendly.status = status;
      }
      if (error && typeof error === 'object' && 'code' in error && error.code) {
        friendly.code = error.code;
      }
      throw friendly;
    }
  };

  const upgradeUserToVendorIfNeeded = async (firebaseUser, backendUser, metadata = {}) => {
    if (!firebaseUser || !backendUser) {
      return backendUser;
    }

    const ensuredUser = await ensureVendorRoleForUser(firebaseUser, backendUser, metadata);
    const previousRole = backendUser?.role?.toLowerCase();
    const ensuredRole = ensuredUser?.role?.toLowerCase();

    if (previousRole !== USER_ROLES.VENDOR && ensuredRole === USER_ROLES.VENDOR) {
      const { backendUser: refreshedBackendUser } = await syncBackendSession(firebaseUser);
      return refreshedBackendUser;
    }

    return ensuredUser ?? backendUser;
  };





  // Login with email/password

  const login = async (email, password, userRole) => {
    try {
      const normalisedEmail = email.trim().toLowerCase();
      const targetRole = userRole || role || USER_ROLES.BUYER;

      const userCredential = await signInWithEmailAndPassword(auth, normalisedEmail, password);
      const firebaseUser = userCredential.user;
      let { backendUser } = await syncBackendSession(firebaseUser);

      if (targetRole === USER_ROLES.VENDOR) {
        backendUser = await upgradeUserToVendorIfNeeded(firebaseUser, backendUser);
      }

      const resolvedRole = backendUser?.role?.toLowerCase() ?? targetRole;
      const profile = composeUserProfile(firebaseUser, backendUser, { role: resolvedRole });

      await saveUserData(profile, resolvedRole, backendUser);

      return { success: true, user: profile };
    } catch (error) {
      console.error('Login error:', error);
      const message = resolveAuthErrorMessage(
        error,
        'Unable to sign you in right now. Please try again.'
      );
      const friendlyError = new Error(message);
      if (error && typeof error === 'object' && 'code' in error) {
        friendlyError.code = error.code;
      }
      if (error && typeof error === 'object' && 'status' in error) {
        friendlyError.status = error.status;
      }
      if (error && typeof error === 'object' && 'email' in error) {
        friendlyError.email = error.email;
      }
      throw friendlyError;
    }
  };


  // Register new user

  const register = async (email, password, userData = {}, userRole) => {
    try {
      const normalisedEmail = (email || '').trim().toLowerCase();
      const targetRole = userRole || USER_ROLES.BUYER;

      const signInMethods = await fetchSignInMethodsForEmail(auth, normalisedEmail);
      if (signInMethods.length) {
        throw new Error('This email is already registered. Please log in.');
      }

      const credential = await createUserWithEmailAndPassword(auth, normalisedEmail, password);
      const firebaseUser = credential.user;
      let { backendUser } = await syncBackendSession(firebaseUser);

      if (targetRole === USER_ROLES.VENDOR) {
        backendUser = await upgradeUserToVendorIfNeeded(firebaseUser, backendUser, userData);
      }

      const resolvedRole = backendUser?.role?.toLowerCase() ?? targetRole;
      const profile = composeUserProfile(firebaseUser, backendUser, {
        ...userData,
        role: resolvedRole,
      });

      await saveUserData(profile, resolvedRole, backendUser);

      return { success: true, user: profile };
    } catch (error) {
      console.error('Registration error:', error);
      const message = resolveAuthErrorMessage(
        error,
        'Unable to create your account right now. Please try again.'
      );
      const friendlyError = new Error(message);
      if (error && typeof error === 'object' && 'code' in error) {
        friendlyError.code = error.code;
      }
      throw friendlyError;
    }
  };



  // Google Sign-In
  const signInWithGoogle = async (idToken, userRole) => {
    try {
      const targetRole = userRole || USER_ROLES.BUYER;
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      let { backendUser } = await syncBackendSession(firebaseUser);
      if (targetRole === USER_ROLES.VENDOR) {
        backendUser = await upgradeUserToVendorIfNeeded(firebaseUser, backendUser, {
          businessName: firebaseUser.displayName,
        });
      }

      const resolvedRole = backendUser?.role?.toLowerCase() ?? targetRole;
      const profile = composeUserProfile(firebaseUser, backendUser, { role: resolvedRole });
      await saveUserData(profile, resolvedRole, backendUser);

      return { success: true, user: profile };
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error('Google sign-in failed. Please try again.');
    }
  };


  // Logout

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      await clearUserData();
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout. Please try again.');
    }
  };


  const value = {
    user,
    role,
    loading,
    isAuthenticated,
    login,
    register,
    signInWithGoogle,
    logout,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
  const fetchBackendUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      return response.data?.user ?? response.data;
    } catch (error) {
      console.warn('Unable to fetch backend user profile', error);
      return null;
    }
  };

  const ensureVendorRoleForUser = async (firebaseUser, backendUser, metadata = {}) => {
    if (!firebaseUser) {
      return backendUser;
    }
    if (backendUser?.role?.toLowerCase() === USER_ROLES.VENDOR) {
      return backendUser;
    }

    const businessName =
      metadata.businessName ||
      metadata.fullName ||
      backendUser?.displayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'Yustam Vendor';

    try {
      await vendorAPI.activate({ businessName });
      if (metadata.businessName || metadata.category || metadata.phone) {
        await vendorAPI.updateProfile({
          businessName: metadata.businessName || businessName,
          category: metadata.category,
          phone: metadata.phone,
        });
      }
    } catch (error) {
      console.warn('Failed to ensure vendor access', error);
      return backendUser;
    }

    const refreshedUser = await fetchBackendUser();
    return refreshedUser ?? backendUser;
  };

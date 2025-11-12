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

      if (payload?.message) {
        throw new Error(payload.message);
      }
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error('Failed to create backend session');
    }
  };





  // Login with email/password

  const login = async (email, password, userRole) => {
    try {
      const normalisedEmail = email.trim().toLowerCase();
      const targetRole = userRole || role || USER_ROLES.BUYER;

      const userCredential = await signInWithEmailAndPassword(auth, normalisedEmail, password);
      const firebaseUser = userCredential.user;
      const { backendUser } = await syncBackendSession(firebaseUser);
      const resolvedRole = backendUser?.role?.toLowerCase() ?? targetRole;
      const profile = composeUserProfile(firebaseUser, backendUser, { role: resolvedRole });

      await saveUserData(profile, resolvedRole, backendUser);

      return { success: true, user: profile };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error(getAuthErrorMessage(error.code));
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
      const { backendUser } = await syncBackendSession(firebaseUser);

      if (targetRole === USER_ROLES.VENDOR) {
        await vendorAPI.activate({ businessName: userData.businessName || userData.fullName || normalisedEmail.split('@')[0] });
        if (userData.businessName || userData.category || userData.phone) {
          await vendorAPI.updateProfile({
            businessName: userData.businessName,
            category: userData.category,
            phone: userData.phone,
          });
        }
      }

      const profile = composeUserProfile(firebaseUser, backendUser, {
        ...userData,
        role: targetRole,
      });

      await saveUserData(profile, targetRole, backendUser);

      return { success: true, user: profile };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && !error.code && error.message) {
        throw error;
      }
      throw new Error(getAuthErrorMessage(error.code));
    }
  };



  // Google Sign-In
  const signInWithGoogle = async (idToken, userRole) => {
    try {
      const targetRole = userRole || USER_ROLES.BUYER;
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      const { backendUser } = await syncBackendSession(firebaseUser);
      if (targetRole === USER_ROLES.VENDOR) {
        await vendorAPI.activate({ businessName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] });
      }

      const profile = composeUserProfile(firebaseUser, backendUser, { role: targetRole });
      await saveUserData(profile, targetRole, backendUser);

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

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Invalid email address. Please check and try again.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

export default AuthContext;

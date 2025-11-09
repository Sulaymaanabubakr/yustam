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
import { authAPI } from '../services/api';
import { API_BASE_URL, USER_ROLES } from '../config/constants';

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
  };

  // Load user data from AsyncStorage on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.user);
      const userRole = await AsyncStorage.getItem(STORAGE_KEYS.role);

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

  const saveUserData = async (userData, userRole) => {
    try {
      const mergedUser = { ...(user || {}), ...userData };
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mergedUser));
      await AsyncStorage.setItem(STORAGE_KEYS.role, userRole);
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
      await AsyncStorage.multiRemove([STORAGE_KEYS.user, STORAGE_KEYS.role, STORAGE_KEYS.token]);
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

  const establishBackendSession = async (email, password) => {
    const formData = new FormData();
    formData.append('email', email.trim().toLowerCase());
    formData.append('password', password);
    formData.append('remember', '1');

    const response = await fetch(`${API_BASE_URL}/login.php`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
      credentials: 'include',
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Unable to reach Yustam servers. Please try again.');
    }

    return payload;
  };

  const destroyBackendSession = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout.php`, {
        method: 'GET',
        credentials: 'include',
      });
    } catch (logoutError) {
      console.warn('Backend logout failed', logoutError);
    }
  };

  // Login with email/password
  const login = async (email, password, userRole) => {
    try {
      const normalisedEmail = email.trim().toLowerCase();
      const targetRole = userRole || role || USER_ROLES.BUYER;

      if (targetRole === USER_ROLES.VENDOR) {
        await establishBackendSession(normalisedEmail, password);
      }

      let firebaseUser;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalisedEmail, password);
        firebaseUser = userCredential.user;
      } catch (authError) {
        const shouldBootstrapVendor =
          targetRole === USER_ROLES.VENDOR &&
          (authError?.code === 'auth/user-not-found' || authError?.code === 'auth/invalid-credential');

        if (!shouldBootstrapVendor) {
          throw authError;
        }

        const signInMethods = await fetchSignInMethodsForEmail(auth, normalisedEmail);
        if (signInMethods.length) {
          throw authError;
        }

        const createdCredential = await createUserWithEmailAndPassword(
          auth,
          normalisedEmail,
          password
        );
        firebaseUser = createdCredential.user;
      }

      if (!firebaseUser) {
        throw new Error('Authentication failed. Please try again.');
      }

      // Get user token
      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem(STORAGE_KEYS.token, token);

      // Prepare user data
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };

      // Save to AsyncStorage
      await saveUserData(userData, targetRole);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error && !error.code && error.message) {
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
      let firebaseUser;

      if (targetRole === USER_ROLES.VENDOR) {
        const vendorPayload = {
          name: userData.fullName || userData.name || normalisedEmail.split('@')[0],
          email: normalisedEmail,
          phone: userData.phone,
          business_name: userData.businessName,
          category: userData.category,
          password,
          confirm: password,
          source: 'mobile-app',
        };

        await authAPI.vendorRegister(vendorPayload);
        try {
          const createdCredential = await createUserWithEmailAndPassword(
            auth,
            normalisedEmail,
            password
          );
          firebaseUser = createdCredential.user;
        } catch (authError) {
          if (authError?.code !== 'auth/email-already-in-use') {
            throw authError;
          }

          const existingCredential = await signInWithEmailAndPassword(
            auth,
            normalisedEmail,
            password
          );
          firebaseUser = existingCredential.user;
        }

        await establishBackendSession(normalisedEmail, password);
      } else {
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalisedEmail,
          password
        );
        firebaseUser = credential.user;
        await authAPI.buyerRegister({ ...userData, email: normalisedEmail, uid: firebaseUser.uid });
      }

      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem(STORAGE_KEYS.token, token);

      const completeUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userData,
        displayName: userData.fullName || userData.displayName || firebaseUser.displayName,
        fullName: userData.fullName || firebaseUser.displayName,
        phone: userData.phone,
        businessName: userData.businessName,
        category: userData.category,
      };

      await saveUserData(completeUserData, targetRole);

      return { success: true, user: completeUserData };
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

      // Get user token
      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem(STORAGE_KEYS.token, token);

      // Call backend to register/login
      await authAPI.googleLogin(idToken, targetRole);

      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };

      await saveUserData(userData, targetRole);

      return { success: true, user: userData };
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
      await destroyBackendSession();
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

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI } from '../services/api';

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

  // Load user data from AsyncStorage on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const userRole = await AsyncStorage.getItem('role');
      
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
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('role', userRole);
      setUser(userData);
      setRole(userRole);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw new Error('Failed to save user data');
    }
  };

  const clearUserData = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'role', 'authToken']);
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  // Login with email/password
  const login = async (email, password, userRole) => {
    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user token
      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem('authToken', token);

      // Prepare user data
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };

      // Save to AsyncStorage
      await saveUserData(userData, userRole);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  // Register new user
  const register = async (email, password, userData, userRole) => {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user token
      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem('authToken', token);

      // Call backend API to save additional data
      if (userRole === 'vendor') {
        await authAPI.vendorRegister({ ...userData, email, uid: firebaseUser.uid });
      } else {
        await authAPI.buyerRegister({ ...userData, email, uid: firebaseUser.uid });
      }

      // Prepare user data
      const completeUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userData,
      };

      // Save to AsyncStorage
      await saveUserData(completeUserData, userRole);

      return { success: true, user: completeUserData };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  // Google Sign-In
  const signInWithGoogle = async (idToken, userRole) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      // Get user token
      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem('authToken', token);

      // Call backend to register/login
      await authAPI.googleLogin(idToken, userRole);

      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };

      await saveUserData(userData, userRole);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Google sign-in error:', error);
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

  // Switch role
  const switchRole = async (newRole) => {
    try {
      await AsyncStorage.setItem('role', newRole);
      setRole(newRole);
    } catch (error) {
      console.error('Error switching role:', error);
      throw new Error('Failed to switch role');
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
    switchRole,
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

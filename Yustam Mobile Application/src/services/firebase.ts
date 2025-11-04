import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';
import type { Persistence } from 'firebase/auth';

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g",
  authDomain: "yustam-50819.firebaseapp.com",
  projectId: "yustam-50819",
  storageBucket: "yustam-50819.firebasestorage.app",
  messagingSenderId: "472601563195",
  appId: "1:472601563195:web:4de5b5208650251ea20c1e",
  measurementId: "G-G9ZXVBPFYM"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth = getAuth(app);

if (Platform.OS !== 'web') {
  try {
    const nativeAuth = require('@firebase/auth/dist/rn/index.js') as {
      initializeAuth: typeof import('firebase/auth').initializeAuth;
      getReactNativePersistence: (storage: typeof ReactNativeAsyncStorage) => Persistence;
    };

    auth = nativeAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error) {
    auth = getAuth(app);
  }
}

export { auth, GoogleAuthProvider, signInWithCredential };

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

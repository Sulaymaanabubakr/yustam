import { initializeApp, getApps, getApp } from 'firebase/app';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g',
  authDomain: 'yustam-50819.firebaseapp.com',
  projectId: 'yustam-50819',
  storageBucket: 'yustam-50819.firebasestorage.app',
  messagingSenderId: '472601563195',
  appId: '1:472601563195:web:4de5b5208650251ea20c1e',
  measurementId: 'G-G9ZXVBPFYM',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    const persistence =
      typeof getReactNativePersistence === 'function'
        ? getReactNativePersistence(ReactNativeAsyncStorage)
        : undefined;
    auth = persistence
      ? initializeAuth(app, { persistence })
      : initializeAuth(app);
  } catch (error) {
    console.warn('Falling back to default Firebase auth', error);
    auth = getAuth(app);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

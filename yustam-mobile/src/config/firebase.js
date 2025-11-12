import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config (same as before)
const firebaseConfig = {
  apiKey: 'AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g',
  authDomain: 'yustam-50819.firebaseapp.com',
  projectId: 'yustam-50819',
  storageBucket: 'yustam-50819.firebasestorage.app',
  messagingSenderId: '472601563195',
  appId: '1:472601563195:web:4de5b5208650251ea20c1e',
  measurementId: 'G-G9ZXVBPFYM',
};

// Initialise only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Persistent Auth (this line fixes it)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

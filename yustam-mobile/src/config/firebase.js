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
  storageBucket: 'yustam-50819.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef123456',
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
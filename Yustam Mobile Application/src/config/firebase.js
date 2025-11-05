import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// YUSTAM Firebase Configuration (from web app)
const firebaseConfig = {
  apiKey: 'AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g',
  authDomain: 'yustam-50819.firebaseapp.com',
  projectId: 'yustam-50819',
  storageBucket: 'yustam-50819.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef123456'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

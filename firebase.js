// firebase.js

// Import core Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// -------------------------------
// 🔹 Your Firebase configuration
// -------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g",
  authDomain: "yustam-50819.firebaseapp.com",
  projectId: "yustam-50819",
  storageBucket: "yustam-50819.appspot.com",  // ✅ fixed ".app" to ".appspot.com"
  messagingSenderId: "472601563195",
  appId: "1:472601563195:web:4de5b5208650251ea20c1e",
  measurementId: "G-G9ZXVBPFYM"
};

// -------------------------------
// 🔹 Initialise Firebase services
// -------------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// -------------------------------
// 🔹 Configure Google Auth provider
// -------------------------------
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// -------------------------------
// 🔹 Export everything for use
// -------------------------------
export { app, db, storage, auth, provider, signInWithPopup };
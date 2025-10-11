// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Export for use in your product and listings scripts
export { app, db, storage };
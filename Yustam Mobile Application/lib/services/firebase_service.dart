import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Firebase Configuration and Services
class FirebaseService {
  // Firebase configuration matching the web app
  static const firebaseConfig = {
    'apiKey': 'AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g',
    'authDomain': 'yustam-50819.firebaseapp.com',
    'projectId': 'yustam-50819',
    'storageBucket': 'yustam-50819.appspot.com',
    'messagingSenderId': '472601563195',
    'appId': '1:472601563195:web:4de5b5208650251ea20c1e',
    'measurementId': 'G-G9ZXVBPFYM'
  };
  
  // Singleton instances
  static FirebaseAuth get auth => FirebaseAuth.instance;
  static FirebaseFirestore get firestore => FirebaseFirestore.instance;
  static FirebaseStorage get storage => FirebaseStorage.instance;
  static GoogleSignIn get googleSignIn => GoogleSignIn();
  
  /// Initialize Firebase
  static Future<void> initialize() async {
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: firebaseConfig['apiKey']!,
        authDomain: firebaseConfig['authDomain']!,
        projectId: firebaseConfig['projectId']!,
        storageBucket: firebaseConfig['storageBucket']!,
        messagingSenderId: firebaseConfig['messagingSenderId']!,
        appId: firebaseConfig['appId']!,
        measurementId: firebaseConfig['measurementId'],
      ),
    );
  }
  
  /// Sign in with email and password
  static Future<UserCredential> signInWithEmailPassword(
    String email,
    String password,
  ) async {
    return await auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }
  
  /// Register with email and password
  static Future<UserCredential> registerWithEmailPassword(
    String email,
    String password,
  ) async {
    return await auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
  }
  
  /// Sign in with Google
  static Future<UserCredential?> signInWithGoogle() async {
    try {
      // Trigger the Google Sign In flow
      final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
      
      if (googleUser == null) {
        // User cancelled the sign-in
        return null;
      }
      
      // Obtain auth details from request
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      
      // Sign in to Firebase with the credential
      return await auth.signInWithCredential(credential);
    } catch (e) {
      print('Error signing in with Google: $e');
      rethrow;
    }
  }
  
  /// Sign out
  static Future<void> signOut() async {
    await Future.wait([
      auth.signOut(),
      googleSignIn.signOut(),
    ]);
  }
  
  /// Get current user
  static User? get currentUser => auth.currentUser;
  
  /// Check if user is signed in
  static bool get isSignedIn => currentUser != null;
  
  /// Firestore Collections
  static CollectionReference get usersCollection => 
    firestore.collection('users');
  
  static CollectionReference get vendorsCollection => 
    firestore.collection('vendors');
  
  static CollectionReference get listingsCollection => 
    firestore.collection('listings');
  
  static CollectionReference get chatsCollection => 
    firestore.collection('chats');
  
  static CollectionReference get notificationsCollection => 
    firestore.collection('notifications');
}

# YUSTAM Mobile Application

The official **YUSTAM Marketplace Mobile Application** built with **Flutter** for Android and iOS.

## 🎯 Features

### Completed
- ✅ Splash Screen with logo animation
- ✅ Onboarding flow (3 slides + role selection)
- ✅ Authentication (Login/Register with all web fields)
- ✅ Google Sign-In integration
- ✅ Buyer Interface with bottom navigation
- ✅ Vendor Dashboard with summary cards
- ✅ Firebase integration (Auth, Firestore, Storage)
- ✅ Persistent login with SharedPreferences
- ✅ YUSTAM branding and theme

### Buyer Features
- Home screen with:
  - Location header & search bar
  - Promotional banner
  - Categories section (horizontal scroll)
  - Popular products section
- Bottom navigation: Home, Search, Chat, Notifications, Profile
- Material Design with YUSTAM colors

### Vendor Features
- Vendor Dashboard with:
  - Welcome section with profile photo
  - Summary cards (Active Listings, Sales, Plan, Verification)
  - Quick action buttons
- Bottom navigation: Home, Chats, Listings, Profile, Settings
- Floating action button for new listings
- Profile photo in navigation bar

## 🎨 Design

### Colors
- **Emerald**: `#004D40` (Primary)
- **Orange**: `#F3731E` (Accent)
- **Beige**: `#EADCCF` (Background)
- **White**: `#FFFFFF`

### Typography
- **Anton**: Display text and headers
- **Inter**: Body text (400, 500, 600, 700 weights)

## 🔧 Setup Instructions

### Prerequisites
- Flutter SDK (3.0.0 or higher)
- Dart SDK
- Android Studio / Xcode
- Firebase CLI

### Installation

1. **Clone the repository**
   ```bash
   cd "Yustam Mobile Application"
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Firebase Configuration**
   
   For Android:
   - Download `google-services.json` from Firebase Console
   - Place it in `android/app/`
   
   For iOS:
   - Download `GoogleService-Info.plist` from Firebase Console
   - Place it in `ios/Runner/`

4. **Run the app**
   ```bash
   # For Android
   flutter run

   # For iOS (macOS only)
   flutter run -d ios
   ```

## 📱 Firebase Setup

The app uses the existing YUSTAM Firebase project:
- **Project ID**: `yustam-50819`
- **Collections**: users, vendors, listings, chats, notifications

### Register Android App
1. Go to Firebase Console
2. Add Android app with package name: `com.yustam.mobile`
3. Download `google-services.json`

### Register iOS App
1. Go to Firebase Console
2. Add iOS app with bundle ID: `com.yustam.mobile`
3. Download `GoogleService-Info.plist`

## 📂 Project Structure

```
lib/
├── main.dart                 # App entry point
├── models/                   # Data models
├── screens/                  # Screen widgets
│   ├── splash/              # Splash screen
│   ├── onboarding/          # Onboarding flow
│   ├── auth/                # Login/Register
│   ├── buyer/               # Buyer screens
│   └── vendor/              # Vendor screens
├── services/                # Services layer
│   ├── firebase_service.dart
│   └── storage_service.dart
├── utils/                   # Utilities
│   ├── constants.dart
│   └── app_theme.dart
└── widgets/                 # Reusable widgets
    ├── category_card.dart
    └── product_card.dart
```

## 🚀 Building for Release

### Android
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### iOS
```bash
flutter build ios --release
# Open in Xcode and archive
```

## 📝 Next Steps

To complete the application:

1. **Implement remaining screens**:
   - Search functionality
   - Chat interface
   - Notifications
   - Profile management
   - Vendor listings management

2. **Add Firebase Cloud Messaging**:
   - Push notifications
   - In-app notifications

3. **Implement image upload**:
   - Profile photos
   - Product images
   - Firebase Storage integration

4. **Add real-time features**:
   - Chat messaging
   - Notifications
   - Listing updates

5. **Testing**:
   - Unit tests
   - Widget tests
   - Integration tests

6. **App Store Submission**:
   - Prepare app store assets
   - Screenshots and descriptions
   - Privacy policy and terms

## 🔐 Security

- Firebase Authentication for secure login
- Firestore security rules (to be configured)
- No sensitive data stored locally
- HTTPS for all network requests

## 📄 License

© 2025 YUSTAM - All Rights Reserved

## 👥 Support

For support, email: support@yustam.com

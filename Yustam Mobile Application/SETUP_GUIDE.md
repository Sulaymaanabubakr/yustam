# YUSTAM Mobile App Setup Guide

This guide will help you set up and run the YUSTAM Mobile Application.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Flutter SDK** (version 3.0.0 or higher)
   - Download from: https://flutter.dev/docs/get-started/install
   - Add Flutter to your PATH

2. **Android Studio** (for Android development)
   - Download from: https://developer.android.com/studio
   - Install Android SDK
   - Set up Android Emulator

3. **Xcode** (for iOS development - macOS only)
   - Download from Mac App Store
   - Install Xcode Command Line Tools

4. **Git**
   - For version control

## Step-by-Step Setup

### 1. Verify Flutter Installation

Open terminal and run:

```bash
flutter doctor
```

This will check your environment and display a report. Resolve any issues shown.

### 2. Navigate to Project Directory

```bash
cd "Yustam Mobile Application"
```

### 3. Install Dependencies

```bash
flutter pub get
```

This will download all required packages specified in `pubspec.yaml`.

### 4. Download and Add Fonts

1. Download **Anton** font from: https://fonts.google.com/specimen/Anton
2. Download **Inter** font from: https://fonts.google.com/specimen/Inter
3. Extract the font files:
   - Anton-Regular.ttf
   - Inter-Regular.ttf
   - Inter-Medium.ttf
   - Inter-SemiBold.ttf
   - Inter-Bold.ttf
4. Place them in `assets/fonts/` directory

### 5. Firebase Configuration

#### For Android:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the YUSTAM project (yustam-50819)
3. Click "Add app" and select Android
4. Enter package name: `com.yustam.mobile`
5. Download `google-services.json`
6. Place it in `android/app/` directory

#### For iOS:

1. In Firebase Console, click "Add app" and select iOS
2. Enter bundle ID: `com.yustam.mobile`
3. Download `GoogleService-Info.plist`
4. Place it in `ios/Runner/` directory

### 6. Run the Application

#### On Android Emulator:

```bash
# Start an Android emulator first
# Then run:
flutter run
```

#### On iOS Simulator (macOS only):

```bash
# Open iOS simulator first
open -a Simulator

# Then run:
flutter run -d ios
```

#### On Physical Device:

1. Enable Developer Mode on your device
2. Connect via USB
3. Run:
```bash
flutter devices  # List connected devices
flutter run -d <device-id>
```

## Testing the App

### Test Accounts

You can create test accounts through the app's registration flow.

**Buyer Account:**
- Full name: Your name
- Email: your-email@example.com
- Phone: Your phone number
- Password: At least 6 characters

**Vendor Account:**
- All buyer fields plus:
  - Business name
  - Category
  - Business description (optional)
  - Address (optional)
  - Plan selection

### Features to Test

1. **Splash Screen**: Should appear for 3 seconds
2. **Onboarding**: Swipe through 3 slides, select role
3. **Authentication**: 
   - Register with email/password
   - Login with existing account
   - Google Sign-In
4. **Buyer Dashboard**:
   - View home screen
   - See categories and products
   - Navigate between tabs
5. **Vendor Dashboard**:
   - View summary cards
   - Access quick actions
   - Navigate between tabs

## Common Issues and Solutions

### Issue: Flutter command not found
**Solution**: Add Flutter to your PATH:
```bash
export PATH="$PATH:[PATH_TO_FLUTTER_GIT_DIRECTORY]/flutter/bin"
```

### Issue: Android licenses not accepted
**Solution**: 
```bash
flutter doctor --android-licenses
```

### Issue: CocoaPods not installed (iOS)
**Solution**:
```bash
sudo gem install cocoapods
cd ios
pod install
```

### Issue: Firebase initialization failed
**Solution**: 
- Verify `google-services.json` (Android) is in correct location
- Verify `GoogleService-Info.plist` (iOS) is in correct location
- Check Firebase project configuration

### Issue: Fonts not displaying correctly
**Solution**:
- Ensure font files are in `assets/fonts/`
- Run `flutter clean` then `flutter pub get`
- Restart the app

## Building for Production

### Android APK

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (for Play Store)

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

### iOS (macOS only)

```bash
flutter build ios --release
```

Then open in Xcode and archive for App Store submission.

## Project Structure Overview

```
lib/
├── main.dart                 # Entry point
├── screens/                  # All screen widgets
│   ├── splash/
│   ├── onboarding/
│   ├── auth/
│   ├── buyer/
│   └── vendor/
├── widgets/                  # Reusable UI components
├── services/                 # Business logic & APIs
├── models/                   # Data models
└── utils/                    # Constants & helpers
```

## Development Tips

1. **Hot Reload**: Press `r` in terminal while app is running
2. **Hot Restart**: Press `R` in terminal
3. **Debug Mode**: Use Android Studio or VS Code debugger
4. **Logs**: Check console output for errors

## Next Development Steps

1. Implement remaining screens (Search, Chat, Notifications, Profile)
2. Add Firebase Cloud Messaging for push notifications
3. Implement image upload functionality
4. Add real-time chat features
5. Connect to existing Firestore collections
6. Add comprehensive error handling
7. Write tests (unit, widget, integration)

## Support

For issues or questions:
- Check the main README.md
- Review Flutter documentation: https://flutter.dev/docs
- Firebase documentation: https://firebase.google.com/docs

## Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Firebase for Flutter](https://firebase.flutter.dev/)
- [Material Design](https://material.io/design)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)

---

© 2025 YUSTAM - All Rights Reserved

# YUSTAM Marketplace Mobile Application

A premium React Native + Expo mobile application for Nigeria's trusted marketplace, enabling buyers and vendors to connect seamlessly.

## 🚀 Features

### Core Features
- **Dual-Role System**: Switch between Buyer and Vendor modes
- **Firebase Authentication**: Email/password and Google Sign-In
- **Premium UI**: Anton + Inter fonts, emerald/orange color scheme
- **Responsive Design**: Optimized for all mobile screen sizes

### Buyer Features
- Browse listings with advanced search and filters
- Save favorite items
- Contact vendors via in-app chat
- View featured and categorized products
- Location-based search

### Vendor Features
- Create and manage product listings
- Upload images via Cloudinary
- **Analytics & Insights Dashboard**
- **Billing History & Payments**
- **Comprehensive Notifications Center**
- **Help & Support with FAQ**
- **Public Storefront**
- **App Settings & Preferences**
- Manage business profile
- Handle customer inquiries

### Screens Implemented
1. **Splash Screen**: Animated logo with fade-in effect
2. **Onboarding**: 3 swipeable intro screens with role selection
3. **Authentication**: Login & Register with all required fields
4. **Home**: Hero search, flash sale banners, categories, featured listings
5. **Search**: Advanced filtering by category, location, and price
6. **Chat**: Message center (shell)
7. **Notifications**: Updates and alerts (shell)
8. **Profile**: User info, role switching, settings, and logout

## 📦 Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7
- **State Management**: Context API + AsyncStorage
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Image Upload**: Cloudinary
- **Fonts**: Anton, Inter (via Expo Google Fonts)
- **Icons**: Ionicons (@expo/vector-icons)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+ and npm 10+
- Expo CLI installed globally: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Studio (for Android emulator)
- Physical device with Expo Go app (optional)

### Installation Steps

1. **Navigate to the mobile app directory:**
   ```bash
   cd "Yustam Mobile Application"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on a platform:**
   - iOS: Press `i` or run `npm run ios`
   - Android: Press `a` or run `npm run android`
   - Web: Press `w` or run `npm run web`
   - Scan QR code with Expo Go app on your phone

## 📁 Project Structure

```
Yustam Mobile Application/
├── App.js                     # Root component with font loading
├── app.json                   # Expo configuration
├── package.json              # Dependencies
├── assets/
│   ├── images/
│   │   └── logo.jpeg         # YUSTAM logo
│   └── fonts/                # (if using custom fonts)
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   └── Toast.js
│   ├── config/               # Configuration files
│   │   ├── firebase.js       # Firebase setup (web config)
│   │   ├── cloudinary.js     # Cloudinary upload helper
│   │   └── constants.js      # App constants (categories, etc.)
│   ├── context/              # React Context providers
│   │   └── AuthContext.js    # Authentication state
│   ├── navigation/           # Navigation setup
│   │   ├── AppNavigator.js   # Root stack navigator
│   │   └── MainTabNavigator.js # Bottom tabs
│   ├── screens/              # All screens
│   │   ├── auth/
│   │   │   ├── AuthScreen.js
│   │   │   ├── LoginForm.js
│   │   │   └── RegisterForm.js
│   │   └── shared/
│   │       ├── SplashScreen.js
│   │       ├── OnboardingScreen.js
│   │       ├── HomeScreen.js
│   │       ├── SearchScreen.js
│   │       ├── ChatScreen.js
│   │       ├── NotificationsScreen.js
│   │       └── ProfileScreen.js
│   ├── services/             # API service layer
│   │   └── api.js            # Axios-based API client
│   └── theme/                # Design system
│       ├── colors.js
│       ├── typography.js
│       ├── spacing.js
│       └── index.js
```

## 🎨 Design System

### Colors
- **Emerald**: `#004D40` (headings, primary accent)
- **Orange**: `#F3731E` (buttons, highlights)
- **Beige**: `#EADCCF` (backgrounds, cards)
- **White**: `#FFFFFF`
- **Ink**: `#111111` (body text)

### Typography
- **Headings**: Anton (bold, tight spacing)
- **Body**: Inter (regular, medium, semibold, bold)

### Spacing
- 8-point grid system
- Border radius: 8, 12, 16, 20, 24px

## 🔥 Firebase Configuration

The app uses the same Firebase project as the YUSTAM web app:

```javascript
{
  apiKey: 'AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g',
  authDomain: 'yustam-50819.firebaseapp.com',
  projectId: 'yustam-50819',
  // ...
}
```

### Native Firebase config files

The platform-specific Firebase bundles contain sensitive keys and are intentionally excluded from version control:

- android/app/google-services.json
- ios/GoogleService-Info.plist

After cloning the repo, download both files from the Firebase console and place them at the paths above. Use the template files (android/app/google-services.example.json and ios/GoogleService-Info.example.plist) as a reference for the required structure, but never commit the real credentials again.

## ☁️ Cloudinary Configuration

Image uploads use the YUSTAM Cloudinary account:

```javascript
{
  cloudName: 'dpc16a0vd',
  uploadPreset: 'yustam_unsigned',
}
```

## 📱 User Flows

### First-Time User
1. Splash Screen (2.5s)
2. Onboarding (3 slides + role selection)
3. Authentication (Login/Register)
4. Main App (Home screen)

### Returning User
1. Splash Screen (2.5s)
2. Auto-login → Main App

### Role Switching
- Users can switch between Buyer and Vendor modes anytime
- Navigate to Profile → Switch Role
- App state updates instantly via AsyncStorage

## 🧪 Testing

The app is designed for manual testing via:
- Expo Go app on physical devices
- iOS Simulator (Mac)
- Android Emulator

**Test Account**:
- Create a test account via the Register screen
- Or use Firebase Auth UI for testing

## ✨ New: Vendor Features (November 2025)

### Complete Vendor Dashboard
The app now includes comprehensive vendor features matching the web dashboard:

1. **Analytics & Insights** - Performance metrics, listing stats, plan usage
2. **Billing History** - Transaction history, payment management
3. **Vendor Notifications** - Full notification center with filtering
4. **Help & Support** - FAQ section and contact form
5. **Vendor Storefront** - Public storefront with share functionality
6. **Settings** - App preferences, privacy, and account management

See **VENDOR_FEATURES.md** for complete documentation.

## 🚧 Known Limitations / Future Enhancements

1. **Google Sign-In**: Placeholder implemented, needs expo-auth-session configuration
2. **Chat System**: Shell screen only, needs WebSocket/Firestore real-time integration
3. **Backend Integration**: Vendor features use mock data, need API connection
4. **Listing Creation**: Vendor create listing flow not yet implemented
5. **Payment Integration**: No payment processing yet (plans are visible)
6. **Offline Mode**: No offline caching yet

## 📄 License

© 2025 YUSTAM - All Rights Reserved

## 👥 Contributors

Built following the YUSTAM web app design and functionality specifications.

## 📞 Support

For issues or questions:
- Check existing web app documentation
- Review Firebase/Cloudinary configs
- Ensure all dependencies are installed correctly

---

**Happy Coding! 🎉**
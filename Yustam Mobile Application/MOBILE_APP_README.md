# YUSTAM Marketplace Mobile Application

A React Native mobile application built with Expo for the YUSTAM Marketplace platform, connecting buyers and vendors across Nigeria.

## 🚀 Features

### Core Features
- **Role-Based Authentication**: Separate registration and login flows for Buyers and Vendors
- **Onboarding Experience**: 3-screen swiper introducing the marketplace
- **Firebase Integration**: Authentication, Firestore database, and Cloud Storage
- **Persistent Sessions**: AsyncStorage for keeping users logged in
- **Beautiful UI**: Modern design following YUSTAM's brand guidelines (Emerald, Orange, Beige)

### Buyer Features
- Modern home screen with categories and product listings
- Search functionality
- Chat with vendors
- Notifications
- Profile management with logout

### Vendor Features
- Business dashboard with key metrics
- Active listings count
- Sales tracking
- Plan information (Free, Starter, Pro, Elite, Power)
- Verification status display
- Quick actions (Add Listing, View Listings, Upgrade Plan)
- Profile management with business details
- Settings panel

## 📁 Project Structure

```
/Yustam Mobile Application
  /src
    /screens          # All screen components
      /buyer          # Buyer-specific screens
      /vendor         # Vendor-specific screens
      AuthScreen.js   # Login/Register tabs
      OnboardingScreen.js
      SplashScreen.js
    /components       # Reusable UI components
      LoginForm.js
      RegisterForm.js
    /navigation       # Navigation configuration
      AppNavigator.js
      BuyerTabNavigator.js
      VendorTabNavigator.js
    /services         # External services
      firebase.js     # Firebase initialization
    /context          # React Context providers
      AuthContext.js  # Auth state management
    /utils            # Helper functions
  /assets             # Images, fonts, etc.
  App.js              # Root component
  app.json            # Expo configuration
```

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK
- **Language**: JavaScript
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Storage**: AsyncStorage for local persistence
- **Backend**: Firebase (Auth, Firestore, Storage)
- **UI Components**: Custom components with React Native primitives
- **Animations**: React Native Reanimated (configured)

## 📦 Dependencies

```json
{
  "@react-navigation/native": "^7.1.19",
  "@react-navigation/bottom-tabs": "^7.7.3",
  "@react-navigation/stack": "^7.6.2",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-picker/picker": "^2.11.4",
  "expo": "~54.0.22",
  "expo-splash-screen": "^31.0.10",
  "expo-notifications": "^0.32.12",
  "expo-image-picker": "^17.0.8",
  "firebase": "^12.5.0",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-reanimated": "^4.1.3",
  "react-native-safe-area-context": "^5.6.2",
  "react-native-screens": "^4.18.0"
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Installation

1. **Navigate to the mobile app directory**:
   ```bash
   cd "Yustam Mobile Application"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Run on your device**:
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## 🔥 Firebase Configuration

The app is already configured to use the existing YUSTAM Firebase project:

```javascript
{
  apiKey: "AIzaSyBQ74sMmOiYEvkxa26Movh0DAnmc0Jz60g",
  authDomain: "yustam-50819.firebaseapp.com",
  projectId: "yustam-50819",
  storageBucket: "yustam-50819.appspot.com",
  messagingSenderId: "472601563195",
  appId: "1:472601563195:web:4de5b5208650251ea20c1e",
}
```

This ensures the mobile app shares the same users, vendors, listings, and data as the web application.

## 🎨 Design System

### Colors
- **Emerald**: `#004D40` (Primary brand color)
- **Orange**: `#F3731E` (Accent color)
- **Beige**: `#EADCCF` (Secondary)
- **White**: `#FFFFFF`
- **Background**: `#F5F5F5`

### Typography
- System fonts are used for optimal native performance
- Font weights: Regular (400), Semibold (600), Bold (700)

## 📱 Screens Overview

### Authentication Flow
1. **Splash Screen**: 3-second animation with YUSTAM logo
2. **Onboarding**: 3 slides with role selection (Buyer/Vendor)
3. **Auth Screen**: Login and Register tabs with complete form validation

### Buyer Interface
- **Home**: Categories, promotional banner, popular products
- **Search**: Product search functionality
- **Chat**: Messaging with vendors
- **Notifications**: Updates and alerts
- **Profile**: User settings and logout

### Vendor Interface
- **Home**: Dashboard with business metrics and quick actions
- **Chats**: Customer communication
- **Listings**: Manage products
- **Profile**: Business details and plan information
- **Settings**: App preferences

## 🔐 Authentication

### Buyer Registration Fields
- Full Name
- Email
- Phone Number
- Password
- Confirm Password

### Vendor Registration Fields
- Full Name
- Email
- Phone Number
- Password
- Confirm Password
- Business Name
- Business Category
- Business Description (optional)
- Business Address (optional)

## 📊 Vendor Plans

The mobile app displays vendor subscription plans:

- **Free Plan**: Up to 5 listings
- **Starter Plan**: ₦3,000/month, 15 listings, verified badge
- **Pro Seller**: ₦5,000/month, 25 listings, priority placement
- **Elite Seller**: ₦8,000/month, 50 listings, premium features
- **Power Vendor**: ₦15,000/month, 100 listings, featured partner

## 🚧 Future Enhancements

- [ ] Google Sign-In integration (requires Expo config)
- [ ] Push notifications setup
- [ ] Image upload for vendor profile and listings
- [ ] Complete chat functionality
- [ ] Search and filter implementation
- [ ] Order management
- [ ] Payment integration
- [ ] Analytics dashboard for vendors
- [ ] Real-time updates with Firestore listeners

## 🐛 Known Issues

- Google Sign-In shows "Coming Soon" - requires Google OAuth configuration in Expo
- Some placeholder screens need full implementation
- FAB navigation to CreateListing screen needs screen creation

## 📝 Notes

- The app uses the same Firebase project as the web application
- All data is synced in real-time between web and mobile
- The app follows YUSTAM's brand guidelines
- Authentication is persistent using AsyncStorage
- The app structure is modular and easy to extend

## 👥 Contributors

Built for YUSTAM Marketplace by the development team.

## 📄 License

Proprietary - All rights reserved by YUSTAM.

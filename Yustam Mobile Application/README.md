# YUSTAM Marketplace Mobile Application

A fully native React Native + Expo mobile application for the YUSTAM Marketplace, Nigeria's trusted community marketplace.

## Features

### ✨ Core Features
- **Splash Screen** - Beautiful animated splash screen with YUSTAM logo
- **Onboarding Flow** - 3 swipable intro screens with role selection (Buyer/Vendor)
- **Authentication** - Complete login and registration with Firebase
  - Email/Password authentication
  - Google Sign-In integration
  - Form validation and error handling
  - Persistent sessions with AsyncStorage

### 🛍️ Buyer Features
- **Home Screen**
  - Location display with search functionality
  - Promotional banners with gradient backgrounds
  - Horizontal scrolling categories
  - Popular products showcase
  - Native mobile design with smooth animations
- **Search** - Find products and vendors
- **Chat** - Message vendors directly
- **Notifications** - Stay updated on orders and messages
- **Profile** - Manage account and view order history

### 🏪 Vendor Features
- **Dashboard**
  - Business stats and analytics
  - Current plan information
  - Verification badge display
- **Listings** - Manage products with edit/delete
- **Chats** - Communicate with customers
- **Profile** - Vendor details and business info
- **Settings** - Update password and manage notifications
- **Floating Action Button** - Quick access to add new listings

## Design System

### Brand Colors
- **Emerald**: `#004d40` (Primary brand color)
- **Orange**: `#f3731e` (Accent and CTA color)
- **Beige**: `#eadccf` (Soft backgrounds)
- **White**: `#ffffff` (Clean backgrounds)

### UI Elements
- Rounded corners on all cards and buttons (8-24px)
- Subtle shadows for depth
- Smooth transitions and animations
- Proper spacing and padding throughout
- Native mobile gestures

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **Authentication**: Firebase Auth
- **Storage**: AsyncStorage for persistence
- **Animations**: React Native Reanimated
- **UI Components**: Expo Linear Gradient, Expo Image Picker

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   - Update the Firebase configuration in `src/services/firebase.ts` with your project credentials
   - Enable Email/Password and Google authentication in Firebase Console

3. **Run the app:**
   ```bash
   # Start Expo dev server
   npm start

   # Run on Android
   npm run android

   # Run on iOS (macOS only)
   npm run ios

   # Run on web
   npm run web
   ```

## Project Structure

```
Yustam Mobile Application/
├── src/
│   ├── screens/          # All screen components
│   │   ├── auth/         # Login & Registration
│   │   ├── buyer/        # Buyer interface screens
│   │   ├── vendor/       # Vendor interface screens
│   │   └── onboarding/   # Onboarding flow
│   ├── navigation/       # Navigation configuration
│   ├── services/         # Firebase & Storage services
│   ├── components/       # Reusable components
│   ├── constants/        # Theme colors and constants
│   └── utils/           # Helper functions
├── assets/              # Images and static assets
└── App.tsx             # Main app entry point
```

## Key Screens

### Authentication Flow
1. **Splash Screen** → Auto-navigates after 3 seconds
2. **Onboarding** → Swipable intro with role selection
3. **Auth Screen** → Login/Register tabs with Firebase integration

### Buyer Interface
Bottom navigation with 5 tabs:
- Home (with categories and products)
- Search
- Chat
- Notifications
- Profile

### Vendor Interface
Bottom navigation with 5 tabs + floating action button:
- Home (dashboard with stats)
- Chats
- Listings
- Profile
- Settings

## Development Notes

- All user data is persisted using AsyncStorage
- Firebase handles authentication state
- User role (buyer/vendor) determines the interface shown
- Sessions persist until manual logout
- Form validation implemented for all inputs
- Error handling and loading states throughout

## Future Enhancements

- [ ] Real-time chat functionality
- [ ] Push notifications via Expo Notifications
- [ ] Image upload for products and profiles
- [ ] Payment integration
- [ ] Order tracking
- [ ] Reviews and ratings
- [ ] Advanced search and filters
- [ ] Dark mode support

## License

© 2025 YUSTAM - All Rights Reserved

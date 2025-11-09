# YUSTAM Mobile App - Quick Setup Guide

## Prerequisites

Before you begin, ensure you have:

1. **Node.js**: Version 20 or higher
   ```bash
   node --version  # Should show v20.x or higher
   ```

2. **npm**: Version 10 or higher
   ```bash
   npm --version  # Should show 10.x or higher
   ```

3. **Expo CLI** (optional but recommended):
   ```bash
   npm install -g expo-cli
   ```

4. **Development Environment**:
   - **For iOS**: macOS with Xcode installed
   - **For Android**: Android Studio with Android SDK
   - **For quick testing**: Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Installation

### Step 1: Navigate to the Project Directory

```bash
cd "Yustam Mobile Application"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React Native
- Expo SDK
- React Navigation
- Firebase
- Cloudinary utilities
- UI libraries

### Step 3: Verify Installation

```bash
npm run start
```

You should see the Expo DevTools open in your browser and a QR code in your terminal.

## Running the App

### Option 1: On Your Phone (Easiest)

1. Install the **Expo Go** app on your phone
2. Run `npm start` in the project directory
3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

### Option 2: iOS Simulator (Mac Only)

```bash
npm run ios
```

Or press `i` after running `npm start`.

### Option 3: Android Emulator

1. Start Android Studio and launch an emulator
2. Run:
   ```bash
   npm run android
   ```
   Or press `a` after running `npm start`.

### Option 4: Web Browser

```bash
npm run web
```

Or press `w` after running `npm start`.

**Note**: The mobile app is optimized for mobile devices. Web version is for quick preview only.

## First Run

### What to Expect

1. **Splash Screen** (2-3 seconds)
   - YUSTAM logo with animation
   - Auto-transitions to onboarding

2. **Onboarding** (first time only)
   - 3 swipeable intro screens
   - Role selection: Buyer or Vendor
   - Can be skipped

3. **Authentication**
   - Login or Create Account tabs
   - All fields validated
   - Google Sign-In button (placeholder)

4. **Home Screen**
   - Hero search section
   - Flash sale banners
   - Browse by categories
   - Featured listings

### Creating a Test Account

**For Buyers:**
1. Select "Buyer" during onboarding (or choose later)
2. Go to "Create Account" tab
3. Fill in:
   - Full Name
   - Email
   - Phone Number
   - Password
   - Confirm Password
4. Accept terms and tap "Create Account"

**For Vendors:**
1. Select "Vendor" during onboarding
2. Fill in additional fields:
   - Business Name
   - Main Category
3. Complete registration

### Switching Roles

1. Navigate to **Profile** tab
2. Tap **Switch Role**
3. Confirm the switch
4. App updates immediately

## Project Configuration

### Firebase

The app uses the YUSTAM Firebase project. Configuration is in:
```
src/config/firebase.js
```

**Current Config:**
- Project ID: `yustam-50819`
- Auth Domain: `yustam-50819.firebaseapp.com`

### Cloudinary

Image uploads are configured to use YUSTAM's Cloudinary account:
```
src/config/cloudinary.js
```

**Current Config:**
- Cloud Name: `dpc16a0vd`
- Upload Preset: `yustam_unsigned`

### API Endpoints

Backend API calls go to:
```
https://yustam.com
```

All endpoints are defined in `src/services/api.js`.

## Troubleshooting

### Common Issues

#### 1. "Metro Bundler Failed"
```bash
# Clear cache and restart
npm start -- --clear
```

#### 2. "Cannot Find Module"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 3. "Fonts Not Loading"
The app uses Google Fonts via Expo. Ensure you have a stable internet connection on first load.

#### 4. "Firebase Authentication Error"
- Check Firebase configuration in `src/config/firebase.js`
- Ensure Firebase project is active
- Verify API key is correct

#### 5. "App Crashes on Startup"
```bash
# Reset Expo cache
expo start -c
```

### Debugging Tips

1. **Enable Remote Debugging**:
   - Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
   - Select "Debug JS Remotely"

2. **Check Console Logs**:
   - Terminal shows console output
   - Use `console.log()` for debugging

3. **React DevTools**:
   ```bash
   npm install -g react-devtools
   react-devtools
   ```

## Development Workflow

### Making Changes

1. Edit files in `src/` directory
2. Save - app hot-reloads automatically
3. Test on device/emulator
4. Commit changes to git

### Project Structure Guide

```
src/
├── components/       # Reusable UI (Button, Input, Toast)
├── config/          # App configuration (Firebase, Cloudinary)
├── context/         # State management (AuthContext)
├── navigation/      # React Navigation setup
├── screens/         # All app screens
│   ├── auth/        # Login, Register
│   └── shared/      # Home, Search, Chat, etc.
├── services/        # API integration
└── theme/           # Colors, fonts, spacing
```

### Adding New Screens

1. Create screen file in `src/screens/`
2. Add route in `src/navigation/`
3. Import required components
4. Style using the theme system

### Using the Theme

```javascript
import theme from '../theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.anton,
    fontSize: theme.typography.fontSize['2xl'],
    color: theme.colors.emerald,
  },
});
```

## Testing Checklist

Before submitting/deploying, test:

- [ ] Splash screen animation
- [ ] Onboarding flow (all 3 slides)
- [ ] Role selection (Buyer/Vendor)
- [ ] Login with email/password
- [ ] Registration with all fields
- [ ] Home screen loads correctly
- [ ] Search with filters
- [ ] Navigation between tabs
- [ ] Profile screen
- [ ] Role switching
- [ ] Logout and re-login

## Next Steps

### Features to Implement

1. **Google Sign-In**:
   - Configure expo-auth-session
   - Set up OAuth credentials
   - Implement in LoginForm.js and RegisterForm.js

2. **Real-time Chat**:
   - Integrate Firebase Realtime Database or Firestore
   - Implement message sending/receiving
   - Add push notifications

3. **Vendor Listing Creation**:
   - Create listing form screen
   - Image upload via Cloudinary
   - Submit to backend API

4. **Payments**:
   - Integrate Paystack or Flutterwave
   - Handle subscription payments
   - Show transaction history

5. **Notifications**:
   - Firebase Cloud Messaging setup
   - Push notification handling
   - In-app notification center

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Firebase for React Native](https://rnfirebase.io/)
- [React Native Documentation](https://reactnative.dev/)

## Support

For questions or issues:
- Check the README.md
- Review existing web app implementation
- Consult Expo documentation

---

Happy building! 🚀

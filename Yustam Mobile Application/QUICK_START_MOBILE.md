# 🚀 Quick Start Guide - YUSTAM Mobile App

## Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
cd "Yustam Mobile Application"
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Open on Your Device

**Option A: Physical Device**
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan the QR code displayed in terminal
3. App will load on your device

**Option B: Emulator**
- **iOS**: Press `i` in terminal (requires Mac + Xcode)
- **Android**: Press `a` in terminal (requires Android Studio)
- **Web**: Press `w` in terminal

## 📱 Testing the App

### Test Accounts (Create Your Own)

**As a Buyer:**
1. Launch app → See splash screen → Onboarding
2. On last slide, tap "Continue as Buyer"
3. Tap "Create Account" tab
4. Fill in:
   - Full Name: `John Doe`
   - Email: `buyer@test.com`
   - Phone: `08012345678`
   - Password: `password123`
   - Confirm Password: `password123`
5. Tap "Create Account"
6. You'll be logged in to Buyer dashboard!

**As a Vendor:**
1. Launch app → See splash screen → Onboarding
2. On last slide, tap "Continue as Vendor"
3. Tap "Create Account" tab
4. Fill in:
   - Full Name: `Jane Smith`
   - Email: `vendor@test.com`
   - Phone: `08087654321`
   - Password: `password123`
   - Confirm Password: `password123`
   - Business Name: `Smith Electronics`
   - Category: Select "Electronics"
5. Tap "Create Account"
6. You'll be logged in to Vendor dashboard!

## 🎯 Key Features to Test

### Buyer Flow
1. ✅ Browse products on home screen
2. ✅ View categories
3. ✅ See promotional banner
4. ✅ Navigate between tabs
5. ✅ View profile
6. ✅ Logout

### Vendor Flow
1. ✅ View dashboard stats
2. ✅ See business information
3. ✅ Check current plan
4. ✅ Navigate quick actions
5. ✅ View profile with plan details
6. ✅ Logout

## 🔧 Development Commands

```bash
# Start development server
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web

# Clear cache and restart
npx expo start --clear
```

## 🐛 Common Issues & Solutions

### Issue: "Module not found" error
**Solution:**
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: Firebase connection errors
**Solution:**
- Check internet connection
- Firebase config is already set up
- Restart the app

### Issue: App won't load on device
**Solution:**
- Ensure device and computer are on same WiFi
- Try scanning QR code again
- Restart Expo Go app

### Issue: White screen after splash
**Solution:**
```bash
npx expo start --clear
```

## 📂 Project Structure Overview

```
src/
├── screens/         # All screen components
│   ├── buyer/      # Buyer-specific screens
│   ├── vendor/     # Vendor-specific screens
│   └── ...         # Common screens
├── components/      # Reusable UI components
├── navigation/      # Navigation configuration
├── services/        # Firebase and API services
├── context/         # React Context (Auth)
├── utils/          # Helper functions & theme
└── ...
```

## 🎨 Customization

### Change Colors
Edit `src/utils/theme.js`:
```javascript
export const Colors = {
  emerald: '#004D40',  // Change this
  orange: '#F3731E',   // And this
  ...
};
```

### Add New Screen
1. Create file in `src/screens/`
2. Import and add to navigator in `src/navigation/`
3. Done!

## 🔥 Firebase Setup (Already Done!)

The app uses the existing YUSTAM Firebase:
- ✅ Authentication
- ✅ Firestore Database
- ✅ Cloud Storage
- ✅ Same data as web app

No additional setup needed!

## 📱 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run on web |

## 🚀 What's Next?

After testing the basics:
1. Try logging in with same credentials on different role
2. Check if logout works correctly
3. Test onboarding flow (clear app data to see it again)
4. Explore the code structure
5. Start adding new features!

## 💡 Pro Tips

1. **Hot Reload**: Shake device to see developer menu
2. **Logs**: View terminal for console.log output
3. **Debugging**: Use Flipper or React Native Debugger
4. **State**: All auth data saved in AsyncStorage
5. **Navigation**: Uses React Navigation v6

## 📞 Need Help?

- Check `MOBILE_APP_README.md` for detailed docs
- Review example screens in `src/screens/`
- Firebase docs: https://firebase.google.com/docs
- Expo docs: https://docs.expo.dev/

## ✨ Happy Coding!

You're all set! Start building amazing features for YUSTAM! 🎉

# YUSTAM Mobile App - Quick Start Guide

**Get the app running in 3 minutes!**

---

## ⚡ Super Quick Start

```bash
# 1. Navigate to the project
cd "Yustam Mobile Application"

# 2. Install dependencies (takes 2-3 minutes)
npm install

# 3. Start the app
npm start
```

**Done!** Scan the QR code with your phone's Expo Go app.

---

## 📱 Installation Options

### Option A: Phone (Recommended for Quick Testing)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start the app**:
   ```bash
   npm start
   ```

3. **Scan QR code**:
   - iOS: Use Camera app
   - Android: Use Expo Go app

4. **App loads on your phone!** 🎉

### Option B: iOS Simulator (Mac Only)

```bash
npm run ios
```

Wait for the simulator to open and the app to load.

### Option C: Android Emulator

1. Start Android Studio and launch an emulator
2. Run:
   ```bash
   npm run android
   ```

### Option D: Web Browser (Preview Only)

```bash
npm run web
```

**Note**: Optimized for mobile devices. Web is for quick preview.

---

## 🧪 Test the App Flow

### First Run
1. **Splash Screen** (2.5s) - See animated logo
2. **Onboarding** - Swipe through 3 screens
3. **Role Selection** - Choose "Buyer" or "Vendor"
4. **Auth Screen** - Tap "Create Account"

### Create Test Account (Buyer)
```
Full Name: Test User
Email: test@yustam.com
Phone: 08012345678
Password: test123
Confirm Password: test123
✓ Agree to terms
```

Tap "Create Account" → Home screen loads!

### Create Test Account (Vendor)
Same as buyer, plus:
```
Business Name: Test Shop
Category: Electronics
```

### Explore Features
- **Home**: Browse categories and flash sales
- **Search**: Apply filters
- **Profile**: View user info
- **Switch Role**: Profile → Switch Role → Switch to Vendor/Buyer

---

## 🔧 Troubleshooting

### "npm install" fails
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

### "Metro bundler failed"
```bash
# Clear cache and restart
npm start -- --clear
```

### Fonts not loading
- Ensure stable internet connection
- Fonts load from Google on first run

### App crashes on startup
```bash
# Reset Expo cache
expo start -c
```

### Changes not reflecting
- Press `r` in terminal to reload
- Or shake device and tap "Reload"

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| **QUICKSTART.md** | This file - 3-minute setup |
| **README.md** | Project overview & architecture |
| **SETUP.md** | Detailed installation guide |
| **FEATURES.md** | Complete feature list |
| **APP_FLOW.md** | User journey diagrams |
| **SCREENS_REFERENCE.md** | Visual mockups |
| **SUMMARY.md** | Project statistics |

---

## 🎯 What's Working

- ✅ Splash screen with animation
- ✅ Onboarding with role selection
- ✅ Login & Registration
- ✅ Home screen (hero, categories, listings)
- ✅ Search with filters
- ✅ Profile with role switching
- ✅ Bottom tab navigation

---

## 🚀 Next Steps After Setup

1. **Test user flows**: Register → Browse → Search → Profile
2. **Switch roles**: Try both Buyer and Vendor modes
3. **Check documentation**: Read FEATURES.md for complete specs
4. **Start developing**: Add real API integration

---

## 💡 Development Tips

### Hot Reload
- Save any file → App reloads automatically
- No need to restart server

### Debug Mode
- Shake device → "Debug JS Remotely"
- Console logs appear in terminal

### Edit Screens
```bash
# Example: Edit Home screen
nano src/screens/shared/HomeScreen.js
# Save → App reloads
```

### Add New Screen
1. Create file in `src/screens/`
2. Add route in `src/navigation/`
3. Import components from `src/components/`

---

## 🎨 Design System Quick Reference

### Colors
```javascript
emerald: '#004D40'  // Headings
orange: '#F3731E'   // Buttons
beige: '#EADCCF'    // Cards
```

### Fonts
```javascript
Anton      // Headings
Inter      // Body text
```

### Import Theme
```javascript
import theme from '../theme';
// Use: theme.colors.orange, theme.spacing.lg
```

---

## ⚙️ Common Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Clear cache
npm start -- --clear

# Install new package
npm install package-name --save
```

---

## 📞 Need Help?

1. **Installation issues**: Check SETUP.md
2. **Feature questions**: Check FEATURES.md
3. **Screen layouts**: Check SCREENS_REFERENCE.md
4. **Flow questions**: Check APP_FLOW.md

---

## 🎉 Success!

If you can see the splash screen and navigate to the home screen, you're all set! 

**Happy coding! 🚀**

---

**Quick Links**:
- [Full Setup Guide](./SETUP.md)
- [Feature List](./FEATURES.md)
- [Screen Reference](./SCREENS_REFERENCE.md)
- [Expo Docs](https://docs.expo.dev/)

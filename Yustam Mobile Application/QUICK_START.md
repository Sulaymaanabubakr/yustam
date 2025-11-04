# YUSTAM Mobile App - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### 1. Prerequisites Check
```bash
flutter --version  # Should be 3.0.0+
```

### 2. Install Dependencies
```bash
cd "Yustam Mobile Application"
flutter pub get
```

### 3. Run the App
```bash
# For Android
flutter run

# For iOS (macOS only)
flutter run -d ios
```

## 📱 App Flow

```
Splash Screen (3 seconds)
    ↓
Onboarding (3 slides)
    ↓
Role Selection
    ├─→ Buyer Selected → Auth (Login/Register) → Buyer Dashboard
    └─→ Vendor Selected → Auth (Login/Register) → Vendor Dashboard
```

## 🎨 Screen Previews

### Splash Screen
- YUSTAM logo centered
- Fade-in and scale animation
- Auto-navigates after 3 seconds

### Onboarding Screens
1. **Slide 1**: "Buy from Verified Vendors" (Emerald icon)
2. **Slide 2**: "Sell Smarter & Reach More" (Orange icon)
3. **Slide 3**: "Join Nigeria's Trusted Community" (Emerald icon)
- Swipe navigation with page indicators
- Skip button on slides 1-2
- Role selection buttons on slide 3

### Authentication
- **Tabs**: Login | Create Account
- **Login Fields**: Email, Password
- **Register Fields** (Buyer):
  - Full Name, Email, Phone
  - Password, Confirm Password
  - Terms checkbox
- **Register Fields** (Vendor):
  - All buyer fields +
  - Business Name, Category
  - Description (optional)
  - Address (optional)
  - Plan Selection
- **Google Sign-In** button
- Password validation indicators

### Buyer Dashboard
**Home Tab**:
- Location: "Lagos, Nigeria" with pin icon
- Search bar (tappable, navigates to Search)
- Promotional Banner:
  - Orange gradient background
  - "New Collection - Flash Sale 40% off"
  - "Shop Now" button
- Categories (horizontal scroll):
  - Phones, Laptops, TVs, Headsets, Fashion, Home
- Popular Products (horizontal scroll):
  - Product cards with image, name, price, rating

**Bottom Navigation**:
- Home 🏠
- Search 🔍
- Chat 💬
- Notifications 🔔
- Profile 👤

### Vendor Dashboard
**Home Tab**:
- Welcome section with profile photo
- Summary Cards (2x2 grid):
  - Active Listings: 12
  - Total Sales: ₦450,000
  - Plan Type: Premium
  - Verification: Verified
- Quick Actions:
  - Manage Listings
  - View Messages
  - Update Profile

**Bottom Navigation**:
- Home 🏠
- Chats 💬
- Listings 📦
- Profile (with photo) 👤
- Settings ⚙️

**Floating Action Button**: + (for new listings)

## 🎨 Design System

### Colors
```dart
Emerald:      #004D40  // Primary
Orange:       #F3731E  // Accent
Beige:        #EADCCF  // Background
White:        #FFFFFF  // Surface
```

### Typography
- **Display**: Anton (uppercase, 0.5 letter-spacing)
- **Body**: Inter (400, 500, 600, 700)

### Spacing
- Small: 8px
- Medium: 16px
- Large: 24px
- Extra Large: 32px

### Border Radius
- Small: 8px
- Medium: 14px
- Large: 16px
- Extra Large: 20px

## 🔧 Development Commands

```bash
# Install dependencies
flutter pub get

# Run app
flutter run

# Hot reload (press in terminal)
r

# Hot restart (press in terminal)
R

# Clean build
flutter clean

# Analyze code
flutter analyze

# Run tests (when added)
flutter test

# Build APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

## 📂 Key Files

```
lib/
├── main.dart                           # App entry point
├── utils/
│   ├── constants.dart                  # Colors, roles, keys
│   └── app_theme.dart                  # Material theme
├── services/
│   ├── firebase_service.dart           # Firebase config & methods
│   └── storage_service.dart            # SharedPreferences wrapper
├── screens/
│   ├── splash/splash_screen.dart       # 3-second splash
│   ├── onboarding/onboarding_screen.dart  # 3 slides + role selection
│   ├── auth/
│   │   ├── auth_screen.dart           # Tab controller
│   │   ├── login_tab.dart             # Login form
│   │   └── register_tab.dart          # Register form
│   ├── buyer/buyer_home_screen.dart    # Buyer dashboard
│   └── vendor/vendor_home_screen.dart  # Vendor dashboard
└── widgets/
    ├── category_card.dart              # Category icon card
    └── product_card.dart               # Product card with rating
```

## 🔥 Firebase Setup

### Required Files

**Android**: `android/app/google-services.json`
```json
{
  "project_info": {
    "project_id": "yustam-50819",
    ...
  }
}
```

**iOS**: `ios/Runner/GoogleService-Info.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
  <dict>
    <key>PROJECT_ID</key>
    <string>yustam-50819</string>
    ...
  </dict>
</plist>
```

### Firestore Collections
- `users` - Buyer accounts
- `vendors` - Vendor accounts
- `listings` - Products/services
- `chats` - Messages
- `notifications` - User notifications

## 🎯 Next Steps

1. **Get Firebase Config Files**:
   - Go to Firebase Console → Project Settings
   - Add Android app (com.yustam.mobile)
   - Add iOS app (com.yustam.mobile)
   - Download config files

2. **Add Fonts**:
   - Download Anton and Inter fonts
   - Place in `assets/fonts/`

3. **Test the App**:
   - Create test buyer account
   - Create test vendor account
   - Test navigation flow

4. **Implement Remaining Screens**:
   - Search with filters
   - Chat interface
   - Notifications list
   - Profile management
   - Listings CRUD

## ⚠️ Common Issues

### "Flutter command not found"
```bash
export PATH="$PATH:/path/to/flutter/bin"
```

### "Android licenses not accepted"
```bash
flutter doctor --android-licenses
```

### "Unable to load asset: assets/logo.jpeg"
- Ensure logo.jpeg is in assets/ folder
- Run `flutter clean && flutter pub get`

### Firebase initialization failed
- Check Firebase config files are in correct locations
- Verify project ID matches: `yustam-50819`

## 📞 Support

- **Documentation**: See README.md and SETUP_GUIDE.md
- **Flutter Docs**: https://flutter.dev/docs
- **Firebase Docs**: https://firebase.flutter.dev/

---

Built with ❤️ for YUSTAM Marketplace

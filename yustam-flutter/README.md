# 📱 Yustam Mobile App (Flutter)

> **Premium native mobile experience for Android & iOS**

[![Flutter](https://img.shields.io/badge/Flutter-3.38.1-02569B?logo=flutter)](https://flutter.dev)
[![Riverpod](https://img.shields.io/badge/Riverpod-3.0-00A8E8)](https://riverpod.dev)
[![Supabase](https://img.shields.io/badge/Supabase-2.8.0-3ECF8E?logo=supabase)](https://supabase.com)

---

## 🎯 Overview

The **Yustam Mobile App** is a luxury classifieds marketplace built with Flutter 3.38.1, offering a seamless experience for both buyers and vendors across Android and iOS platforms.

### Key Features
- 🛍️ Browse and search listings with advanced filters
- 💬 Real-time chat with Firebase integration
- ✅ Plan-based feature gating (100% invisible higher-tier features)
- 💳 Paystack payment integration for subscriptions
- 🤖 AI-powered assistance (Gemini 2.5 Pro)
- 📊 Vendor analytics dashboard
- 🎨 Glassmorphism UI with micro-animations
- 🌓 Perfect dark/light mode

---

## 🛠️ Tech Stack

- **Framework**: Flutter 3.38.1
- **State Management**: Riverpod 3.0
- **Navigation**: go_router
- **Backend**: Supabase Flutter 2.8.0
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Payments**: Paystack Flutter plugin
- **AI**: Google Gemini 2.5 Pro API
- **Chat**: Supabase Realtime
- **Local Storage**: Hive / SharedPreferences
- **Image Picker**: image_picker
- **Splash Screen**: flutter_native_splash

---

## 📁 Project Structure

```
yustam-flutter/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── config/
│   │   ├── env.dart             # Environment variables
│   │   ├── theme.dart           # App theme (dark/light)
│   │   └── routes.dart          # go_router configuration
│   ├── core/
│   │   ├── providers/           # Riverpod providers
│   │   ├── services/            # API, Auth, Storage services
│   │   └── utils/               # Helpers, formatters
│   ├── features/
│   │   ├── auth/                # Login, Register, Password Reset
│   │   ├── buyer/               # Buyer-specific screens
│   │   ├── vendor/              # Vendor-specific screens
│   │   ├── listings/            # Browse, Search, Detail
│   │   ├── chat/                # Messaging
│   │   ├── profile/             # User profile
│   │   └── subscriptions/       # Plans, Billing
│   └── shared/
│       ├── widgets/             # Reusable components
│       └── models/              # Data models
├── assets/
│   ├── images/                  # App images
│   ├── icons/                   # Custom icons
│   └── fonts/                   # Custom fonts (Satoshi, Clash Display)
├── pubspec.yaml                 # Dependencies
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.38.1 or higher
- Android Studio / Xcode
- Supabase account
- Paystack account

### Installation

1. **Install Flutter dependencies**
```bash
flutter pub get
```

2. **Configure environment variables**
Create `lib/config/env.dart`:
```dart
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const PAYSTACK_PUBLIC_KEY = 'pk_live_21106eb17dafe8fbdca6708b57cef484d8a125ef';
const GEMINI_API_KEY = 'your-gemini-api-key';
```

3. **Run the app**
```bash
# Android
flutter run

# iOS
flutter run -d ios

# Web (for testing)
flutter run -d chrome
```

---

## 📦 Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^3.0.0
  riverpod_annotation: ^3.0.0
  
  # Navigation
  go_router: ^14.0.0
  
  # Backend
  supabase_flutter: ^2.8.0
  
  # Payments
  flutter_paystack: ^2.0.0
  
  # AI
  google_generative_ai: ^0.4.0
  
  # UI
  flutter_svg: ^2.0.0
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  lottie: ^3.0.0
  
  # Utils
  intl: ^0.19.0
  timeago: ^3.6.0
  image_picker: ^1.0.0
  file_picker: ^8.0.0
  url_launcher: ^6.2.0
  share_plus: ^7.2.0
  
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.0
  riverpod_generator: ^3.0.0
  flutter_native_splash: ^2.3.0
```

---

## 🎨 Design System

### Color Palette
```dart
// Light Mode
primaryColor: Color(0xFFF3731E),      // Orange
secondaryColor: Color(0xFF0F6A53),    // Emerald Green
backgroundColor: Color(0xFFF5F5F5),
surfaceColor: Color(0xFFFFFFFF),
textColor: Color(0xFF1A1A1A),

// Dark Mode
primaryColor: Color(0xFFF3731E),      // Orange
secondaryColor: Color(0xFF10B981),    // Lighter Emerald
backgroundColor: Color(0xFF0A0A0A),
surfaceColor: Color(0xFF1A1A1A),
textColor: Color(0xFFF5F5F5),
```

### Typography
- **Primary Font**: Satoshi (Google Fonts alternative)
- **Display Font**: Clash Display style
- **Weights**: Regular (400), Medium (500), SemiBold (600), Bold (700)

### UI Principles
- **Glassmorphism**: Frosted glass effect on cards
- **Micro-animations**: Smooth transitions (200-300ms)
- **Hero animations**: Between screens
- **Haptic feedback**: On interactions
- **Skeleton loaders**: For async content

---

## 🔐 Authentication Flow

1. User opens app → Check if logged in (Supabase session)
2. If not logged in → Show auth screen (Login/Register)
3. User registers/logs in → Firebase/Supabase Auth
4. Backend creates/updates user in database
5. App stores session locally
6. User navigates to appropriate dashboard (Buyer/Vendor)

---

## 💳 Subscription Flow

1. Vendor navigates to Plans screen
2. Selects plan tier and duration
3. Taps "Subscribe" → Paystack checkout opens
4. User completes payment
5. Paystack webhook notifies backend
6. Backend updates `vendors.plan` column
7. App refetches user profile
8. New features instantly appear in UI

---

## 🤖 AI Integration

### Features
- Smart listing descriptions
- Price recommendations
- Category suggestions
- Buyer inquiry responses

### Usage Limits (Plan-Gated)
```dart
final aiLimits = {
  'free': 0,
  'starter': 5,
  'pro': 20,
  'elite': 50,
  'power': -1, // Unlimited
};
```

### Implementation
```dart
// Check daily limit before AI query
final canUseAI = await checkAILimit(userPlan);
if (!canUseAI) {
  showUpgradeDialog();
  return;
}

// Make AI request
final response = await geminiService.generateText(prompt);
```

---

## 📱 Screens

### Buyer Screens
- Home (Browse feed)
- Search (Filters)
- Listing Detail
- Saved Listings
- Chat Inbox
- Profile
- Notifications

### Vendor Screens
- Vendor Dashboard
- My Listings
- Create/Edit Listing
- Storefront Preview
- Plans & Subscriptions
- Billing History
- Analytics
- Verification
- Settings

### Shared Screens
- Splash Screen
- Onboarding
- Auth (Login/Register)
- Chat Thread
- Support

---

## 🧪 Testing

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Integration tests
flutter drive --target=test_driver/app.dart
```

---

## 📦 Build & Release

### Android
```bash
# Build APK
flutter build apk --release

# Build App Bundle
flutter build appbundle --release
```

### iOS
```bash
# Build IPA
flutter build ipa --release
```

---

## 🔧 Configuration

### Android (`android/app/build.gradle`)
```gradle
android {
    compileSdkVersion 34
    minSdkVersion 21
    targetSdkVersion 34
    
    defaultConfig {
        applicationId "com.yustam.marketplace"
        versionCode 1
        versionName "1.0.0"
    }
}
```

### iOS (`ios/Runner/Info.plist`)
```xml
<key>CFBundleIdentifier</key>
<string>com.yustam.marketplace</string>
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
```

---

## 📄 License

Copyright © 2025 Yustam Marketplace. All rights reserved.

---

**Built with ❤️ using Flutter**

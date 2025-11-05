# YUSTAM Mobile App - Screen Flow Diagram

## Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP LAUNCH                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Splash Screen   │
                    │  (2.5 seconds)   │
                    │  - Logo Animation│
                    │  - Check Auth    │
                    └──────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
          ┌─────────▼─────────┐  ┌──────▼────────┐
          │  Not Authenticated │  │ Authenticated │
          └─────────┬─────────┘  └──────┬────────┘
                    │                    │
        ┌───────────┴──────────┐         │
        │                      │         │
┌───────▼──────┐      ┌───────▼─────┐   │
│  Onboarding  │      │   Auth      │   │
│  (First Time)│      │   Screen    │   │
│              │      │             │   │
│ • 3 Slides   │      │ • Login     │   │
│ • Skip       │      │ • Register  │   │
│ • Role Pick  │      │ • Google    │   │
└───────┬──────┘      └───────┬─────┘   │
        │                     │         │
        └──────────┬──────────┘         │
                   │                    │
                   └────────┬───────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │   Main Tabs    │
                   │  Navigation    │
                   └────────────────┘
                            │
        ┌───────────────────┼───────────────────┬───────────────┐
        │                   │                   │               │
┌───────▼──────┐  ┌─────────▼────┐  ┌──────────▼──┐  ┌────────▼──────┐
│     HOME     │  │    SEARCH    │  │    CHAT     │  │ NOTIFICATIONS │
│              │  │              │  │             │  │               │
│ • Hero       │  │ • Filters    │  │ • Messages  │  │ • Updates     │
│ • Flash Sale │  │ • Category   │  │ • Threads   │  │ • Alerts      │
│ • Categories │  │ • Location   │  │ (Shell)     │  │ (Shell)       │
│ • Featured   │  │ • Price      │  │             │  │               │
│              │  │              │  │             │  │               │
│ [Vendor FAB] │  │              │  │             │  │               │
└──────────────┘  └──────────────┘  └─────────────┘  └───────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│             PROFILE TAB               │
│                                       │
│ • User Info & Avatar                 │
│ • Role Badge (Buyer/Vendor)          │
│                                       │
│ ┌─────────────────────────────────┐ │
│ │  Main Menu                       │ │
│ │  • Edit Profile                  │ │
│ │  • My Listings (Vendor)          │ │
│ │  • Plans & Billing (Vendor)      │ │
│ │  • Verification (Vendor)         │ │
│ │  • Saved Items (Buyer)           │ │
│ │  • Switch Role ◄──────────────┐  │ │
│ └─────────────────────────────────┘ │
│                                  │  │
│ ┌─────────────────────────────────┐ │
│ │  Settings                        │ │
│ │  • Change Password               │ │
│ │  • Notifications                 │ │
│ │  • Language                      │ │
│ └─────────────────────────────────┘ │
│                                       │
│ ┌─────────────────────────────────┐ │
│ │  Support                         │ │
│ │  • Help & Support                │ │
│ │  • Privacy Policy                │ │
│ │  • Terms & Conditions            │ │
│ └─────────────────────────────────┘ │
│                                       │
│         [ Logout Button ]             │
└───────────────────────────────────────┘
                  │
                  │ (Switch Role)
                  ▼
        ┌──────────────────┐
        │ Update AsyncStorage│
        │ role: buyer/vendor│
        └──────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ Reload Navigation │
        │ (instant update) │
        └──────────────────┘
```

## Screen-by-Screen Details

### 1. Splash Screen
**Purpose**: Brand introduction & authentication check
**Duration**: 2.5 seconds
**Animations**: Fade-in + scale-up
**Logic**:
```javascript
if (isAuthenticated && hasRole) {
  navigate('MainTabs')
} else if (hasSeenOnboarding) {
  navigate('Auth')
} else {
  navigate('Onboarding')
}
```

### 2. Onboarding
**Screens**: 3 swipeable slides
**Features**:
- Pagination dots
- Skip button
- Next/Get Started buttons
- Role selection cards at end

**Slide 1**: "Buy from Verified Vendors"
**Slide 2**: "Sell Smarter, Grow Faster"
**Slide 3**: Role Selection
- Buyer card (emerald)
- Vendor card (orange)

**Action**: Saves role to AsyncStorage → Navigate to Auth

### 3. Authentication
**Tabs**: Login | Create Account
**Fields**:

**Login**:
- Email
- Password
- Forgot Password link
- Google Sign-In button

**Register (Buyer)**:
- Full Name
- Email
- Phone
- Password
- Confirm Password
- Terms checkbox
- Google Sign-Up button

**Register (Vendor)** - Additional:
- Business Name
- Category dropdown
- Terms checkbox

**Success**: Save to AsyncStorage + Firebase → Navigate to MainTabs

### 4. Main App (Bottom Tabs)

#### Tab 1: HOME
**Sections** (top to bottom):
1. **Hero**: 
   - Bold Anton heading
   - Search card (location + input + button)
2. **Flash Sales**: 
   - Horizontal carousel
   - 2 animated banner cards
3. **Categories**: 
   - Grid layout (3 columns)
   - 12 category cards
4. **Featured Listings**: 
   - Horizontal scroll
   - Product cards

**Vendor-only**: FAB (bottom-right, orange circle with +)

#### Tab 2: SEARCH
**Sections**:
- Large search input
- **Filters**:
  - Category dropdown (12 options)
  - Location dropdown (37 states)
  - Price range (min/max)
- Apply Filters button
- Results area (placeholder)

#### Tab 3: CHAT
**Current**: Empty state
**Future**: 
- Chat list
- Message threads
- Real-time updates

#### Tab 4: NOTIFICATIONS
**Current**: Empty state
**Future**: 
- Notification list
- Categories (orders, messages, updates)
- Mark as read

#### Tab 5: PROFILE
**Header**:
- Avatar (photo or placeholder)
- Name (Anton)
- Email
- Role badge

**Menus**:
- Main (Edit Profile, Listings, Plans, Saved, **Switch Role**)
- Settings (Password, Notifications, Language)
- Support (Help, Privacy, Terms)
- Logout button (outline style)

## Role-Based Differences

### Buyer Mode
**Visible**:
- Saved Items menu
- Standard home view
- No FAB

**Hidden**:
- My Listings
- Plans & Billing
- Verification

### Vendor Mode
**Visible**:
- My Listings menu
- Plans & Billing menu
- Verification menu
- FAB on Home screen

**Hidden**:
- Saved Items

## State Persistence

### AsyncStorage Keys
```javascript
{
  'user': JSON.stringify(userObject),
  'role': 'buyer' | 'vendor',
  'authToken': firebaseToken,
  'onboardingComplete': 'true' | 'false'
}
```

### AuthContext State
```javascript
{
  user: { uid, email, displayName, photoURL },
  role: 'buyer' | 'vendor',
  isAuthenticated: true | false,
  loading: true | false
}
```

## Navigation Structure

```
NavigationContainer
└── Stack.Navigator (AppNavigator)
    ├── Onboarding Screen (conditional)
    ├── Auth Screen
    └── MainTabs
        └── Tab.Navigator (MainTabNavigator)
            ├── Home
            ├── Search
            ├── Chat
            ├── Notifications
            └── Profile
```

## User Journeys

### Journey 1: First-Time Buyer
1. Splash → Onboarding → Choose "Buyer" → Auth → Register
2. Fill buyer fields → Create Account
3. Home screen loads → Browse categories
4. Search for products → View listings

### Journey 2: First-Time Vendor
1. Splash → Onboarding → Choose "Vendor" → Auth → Register
2. Fill buyer fields + business name + category → Create Account
3. Home screen loads → Tap FAB → Create listing
4. Upload images → Fill details → Publish

### Journey 3: Returning User
1. Splash → Auto-login → Home screen
2. Browse, search, chat, check notifications
3. Profile → View settings

### Journey 4: Role Switching
1. Navigate to Profile tab
2. Tap "Switch Role"
3. Confirm dialog
4. AsyncStorage updates
5. Context re-renders
6. UI updates instantly (FAB appears/disappears)

## Error States

### Network Errors
- Toast: "Network error. Please check your connection."
- Red toast with error icon

### Auth Errors
- Email already in use → "This email is already registered..."
- Wrong password → "Incorrect password..."
- Invalid email → "Please enter a valid email"

### Form Validation
- Empty fields → Red border + error text below
- Password mismatch → "Passwords do not match"
- Weak password → "Password must be at least 6 characters"

## Loading States

### Authentication
- Button shows spinner
- Text changes to "Loading..."
- Button disabled

### Screen Transitions
- Smooth animations
- No flicker

### Data Fetching
- Skeleton screens (future)
- Loading spinners
- Pull-to-refresh (future)

---

**This flow represents the complete implemented navigation structure of the YUSTAM mobile app.**

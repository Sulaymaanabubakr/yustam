# YUSTAM Mobile Application - Visual Guide

## 📱 Screen Layouts & Components

This guide provides a detailed breakdown of each screen's layout and components for reference and implementation.

---

## 🎬 1. Splash Screen

```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│      ┌─────────┐       │
│      │         │       │
│      │  YUSTAM │       │  ← Logo (200x200px)
│      │  LOGO   │       │    Fade-in animation
│      │         │       │    Duration: 1s
│      └─────────┘       │
│                         │
│                         │
│                         │
│   White Background      │
│   #ffffff              │
└─────────────────────────┘
```

**Auto-navigate after 3 seconds**

---

## 🎯 2. Onboarding Screens

### Screen 1 of 3
```
┌─────────────────────────┐
│     [Skip]              │ ← Top navigation
│                         │
│         🛍️              │ ← Large emoji (100px)
│                         │
│  Buy from Verified      │
│      Vendors            │ ← Title (32px, bold)
│                         │
│  Shop with confidence   │
│  from trusted sellers   │ ← Description (18px)
│  across Nigeria.        │
│                         │
│      • ○ ○              │ ← Pagination dots
│                         │
│            [Next →]     │ ← Navigation button
└─────────────────────────┘
```

### Screen 3 of 3 (Final - Role Selection)
```
┌─────────────────────────┐
│                         │
│         🤝              │
│                         │
│  Join the Community     │
│                         │
│  Nigeria's most trusted │
│  marketplace.           │
│                         │
│      ○ ○ •              │
│                         │
│   Continue as:          │
│                         │
│  ┌─────────────────┐   │
│  │ 🛒 Buyer        │   │ ← Emerald button
│  │ Shop from       │   │
│  │ verified vendors│   │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │
│  │ 🏪 Vendor       │   │ ← Orange button
│  │ Sell and grow   │   │
│  │ your business   │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

---

## 🔐 3. Authentication Screens

### Login Tab
```
┌─────────────────────────┐
│                         │
│       YUSTAM            │ ← Logo (48px)
│   Vendor Portal/        │
│   Welcome Back          │
│                         │
│  [Login] [Register]     │ ← Tabs
│   ━━━━                  │
│                         │
│  Email Address          │
│  ┌─────────────────┐   │
│  │ example@...     │   │
│  └─────────────────┘   │
│                         │
│  Password               │
│  ┌─────────────────┐   │
│  │ ••••••••        │   │
│  └─────────────────┘   │
│           Forgot?       │
│                         │
│  ┌─────────────────┐   │
│  │   Sign In       │   │ ← Orange button
│  └─────────────────┘   │
│                         │
│        or               │
│                         │
│  ┌─────────────────┐   │
│  │ 🔐 Google       │   │ ← White button
│  └─────────────────┘   │
└─────────────────────────┘
```

### Register Tab (Vendor)
```
┌─────────────────────────┐
│                         │
│  [Login] [Register]     │
│         ━━━━━━━         │
│                         │
│  Full Name *            │
│  ┌─────────────────┐   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  Email Address *        │
│  ┌─────────────────┐   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  Phone Number *         │
│  ┌─────────────────┐   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  Password *             │
│  ┌─────────────────┐   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  Confirm Password *     │
│  ┌─────────────────┐   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  Business Name *        │
│  ┌─────────────────┐   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  Main Category *        │
│  ┌─────────────────┐   │
│  │ Select... ▼     │   │
│  └─────────────────┘   │
│                         │
│  □ I agree to T&C       │
│                         │
│  ┌─────────────────┐   │
│  │ Create Account  │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

---

## 🛍️ 4. Buyer Home Screen

```
┌─────────────────────────┐
│ 📍 Lagos, Nigeria   🔔 │ ← Header
│                         │
│  🔍 Search products...  │ ← Search bar
│                         │
│ ┌───────────────────┐  │ ← Banner (gradient)
│ │ New Collection    │  │
│ │ Flash Sale up to  │  │
│ │ 40% off          🎁 │
│ │ [Shop Now]        │  │
│ └───────────────────┘  │
│                         │
│  Category      See All →│ ← Section header
│                         │
│  ┌───┐ ┌───┐ ┌───┐    │
│  │📱 │ │💻 │ │📺 │ →  │ ← Categories
│  │   │ │   │ │   │    │   (scroll →)
│  └───┘ └───┘ └───┘    │
│ Phone Laptop TVs       │
│                         │
│  Popular Now   See All →│
│                         │
│  ┌─────┐ ┌─────┐       │
│  │ 📱  │ │ 📱  │  →    │ ← Products
│  │Name │ │Name │       │   (scroll →)
│  │₦1.2M│ │₦950K│       │
│  │⭐4.8│ │⭐4.7│       │
│  │Order│ │Order│       │
│  └─────┘ └─────┘       │
│                         │
│ [🏠] [🔍][💬][🔔][👤] │ ← Bottom tabs
└─────────────────────────┘
```

**Components Breakdown:**

1. **Header Bar**
   - Location: "📍 Lagos, Nigeria"
   - Notification icon: Rounded soft background
   - Height: ~60px

2. **Search Bar**
   - Gray background (#f5f5f5)
   - Rounded corners (16px)
   - Search icon 🔍
   - Placeholder text

3. **Promotional Banner**
   - Orange gradient (#f3731e → #e05e0e)
   - Left text area
   - Right emoji/image area
   - "Shop Now" button (white bg)
   - Rounded (20px) with shadow

4. **Category Section**
   - Header: "Category" + "See All →"
   - Horizontal scroll cards
   - Each card: 100px wide
   - Icon (32px) + label
   - White background, rounded (16px), shadow

5. **Products Section**
   - Header: "Popular Now" + "See All →"
   - Horizontal scroll cards
   - Each card: 180px wide
   - Components:
     - Image area (gray bg)
     - Product name (16px, bold)
     - Price (18px, orange, bold)
     - Rating (⭐ + number)
     - "Order Now" button (emerald)

6. **Bottom Navigation**
   - 5 tabs: Home, Search, Chat, Notifications, Profile
   - Active tab: Orange highlight
   - Icons: 24px emojis
   - Labels: 12px

---

## 🏪 5. Vendor Home Screen

```
┌─────────────────────────┐
│                         │
│  Welcome back,          │
│  Business Name          │ ← Header
│  ✓ Verified             │
│                         │
│  ┌─────┐   ┌─────┐     │
│  │  0  │   │  0  │     │ ← Stats cards
│  │Active│   │Orders│    │
│  └─────┘   └─────┘     │
│                         │
│  ┌─────────────────┐   │
│  │ Current Plan    │   │ ← Plan card
│  │ Free Plan       │   │   (emerald bg)
│  │                 │   │
│  │ [Upgrade Plan]  │   │
│  └─────────────────┘   │
│                         │
│  Quick Actions          │
│                         │
│  ┌─────────────────┐   │
│  │ 📦 Add Product  │   │
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │ 📊 Analytics    │   │
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │ 💬 Messages     │   │
│  └─────────────────┘   │
│                         │
│ [🏠][💬][📦][👤][⚙️] │ ← Bottom tabs
│                    ╭─╮  │
│                    │+│  │ ← Floating button
│                    ╰─╯  │
└─────────────────────────┘
```

**Components Breakdown:**

1. **Header**
   - Greeting: "Welcome back,"
   - Business name (32px, bold, emerald)
   - Verification badge (if verified)

2. **Stats Cards** (Side by side)
   - White background
   - Rounded (20px)
   - Shadow
   - Large number (32px, orange)
   - Label below (14px, gray)

3. **Plan Card**
   - Emerald background
   - White text
   - "Current Plan" label
   - Plan name (24px, bold)
   - "Upgrade Plan" button (orange)
   - Rounded (20px), shadow

4. **Quick Actions**
   - Section title
   - Multiple action cards
   - Each card:
     - Icon (24px) + text (16px)
     - White background
     - Rounded (16px), shadow
     - Full width

5. **Floating Action Button**
   - Position: Bottom-right
   - Size: 60x60px
   - Orange background
   - White "+" icon (32px)
   - Large shadow
   - Above bottom navigation

6. **Bottom Navigation**
   - 5 tabs: Home, Chats, Listings, Profile, Settings
   - Same styling as buyer tabs

---

## ⚙️ 6. Settings Screen

```
┌─────────────────────────┐
│                         │
│  Settings               │ ← Title (32px)
│                         │
│  ┌─────────────────┐   │
│  │ 🔔 Notifications│→ │
│  ├─────────────────┤   │ ← Settings group
│  │ 🔒 Password     │→ │   (white card)
│  ├─────────────────┤   │
│  │ 📄 Terms        │→ │
│  ├─────────────────┤   │
│  │ 🔐 Privacy      │→ │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │
│  │     Logout      │   │ ← Red button
│  └─────────────────┘   │
│                         │
└─────────────────────────┘
```

---

## 👤 7. Profile Screen

```
┌─────────────────────────┐
│                         │
│  Profile                │
│                         │
│  ┌─────────────────┐   │
│  │ Name            │   │
│  │ John Doe        │   │
│  │                 │   │
│  │ Email           │   │
│  │ john@email.com  │   │ ← Info card
│  │                 │   │   (white, shadow)
│  │ Phone           │   │
│  │ 0801234567      │   │
│  │                 │   │
│  │ Role            │   │
│  │ Buyer/Vendor    │   │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │
│  │     Logout      │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

---

## 🎨 Color Usage Guide

### Primary Actions
- **Orange (#f3731e)**: CTAs, accent elements
  - "Sign In" buttons
  - "Order Now" buttons
  - "Shop Now" buttons
  - Active tab indicator
  - Floating action button

### Brand Identity
- **Emerald (#004d40)**: Headers, primary text
  - Logo text
  - Page titles
  - Business names
  - Primary buttons (vendor context)

### Backgrounds
- **White (#ffffff)**: Clean surfaces
  - Screen backgrounds
  - Card backgrounds
  - Input fields

- **Beige (#eadccf)**: Soft accents
  - Notification icon background
  - Decorative elements

- **Gray (#f5f5f5)**: Neutral backgrounds
  - Search bar background
  - Product image containers

### Status Colors
- **Success (#1b8a5a)**: Verification badges
- **Error (#d84315)**: Logout buttons, error states

---

## 📐 Spacing Reference

### Component Padding
```
Card padding:      16-24px
Button padding:    12-16px vertical, 16-32px horizontal
Screen padding:    16-24px horizontal
Section spacing:   24-32px vertical
```

### Element Spacing
```
xs (4px):   Icon-to-text gap
sm (8px):   Input field gap
md (16px):  Card internal spacing
lg (24px):  Section spacing
xl (32px):  Major section breaks
xxl (48px): Top/bottom screen padding
```

### Border Radius
```
sm (8px):   Small elements
md (12px):  Inputs, small buttons
lg (16px):  Cards, large buttons
xl (20px):  Large cards, banners
xxl (24px): Special containers
full (999px): Pills, circular buttons
```

---

## 🔤 Typography Scale

```
xxxl (32px):  Page titles, hero text
xxl (24px):   Section headings, banner titles
xl (20px):    Subsection headings
lg (18px):    Important text, descriptions
md (16px):    Body text, labels
sm (14px):    Secondary text, captions
xs (12px):    Tab labels, fine print
```

**Font Weights:**
- Regular (400): Body text
- Medium (500): Labels
- Semibold (600): Buttons, emphasis
- Bold (700): Headers, titles

---

## 🎭 Shadow Styles

### Small
```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 2,  // Android
```
**Usage**: Category cards, small buttons

### Medium
```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 8,
elevation: 4,
```
**Usage**: Product cards, action buttons, settings cards

### Large
```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.2,
shadowRadius: 16,
elevation: 8,
```
**Usage**: Promotional banners, floating buttons, modals

---

## 📱 Responsive Behavior

### Horizontal Scrolling
- Categories section: Scroll horizontally
- Products section: Scroll horizontally
- Infinite scroll possible with data loading

### Vertical Scrolling
- Main content area: Scroll vertically
- Forms: Scroll vertically when keyboard appears

### Keyboard Handling
- Screen adjusts when keyboard opens
- Keep active input visible
- "Done" button on iOS numeric keyboard

---

## 🎬 Animation Timings

```
Splash fade-in:     1000ms
Screen transitions:  300ms
Button press:        150ms
Tab change:          200ms
Card hover:          180ms
Loading spinner:     800ms (rotation)
```

---

## ✅ Interaction States

### Buttons
- **Normal**: Full color, shadow
- **Pressed**: Scale 0.98, opacity 0.8
- **Disabled**: Opacity 0.6, no shadow

### Input Fields
- **Normal**: Gray border
- **Focus**: Orange border + shadow
- **Error**: Red border + error text
- **Disabled**: Gray background

### Cards
- **Normal**: White background, shadow
- **Pressed**: Scale 0.98
- **Active**: Orange accent border

---

This visual guide provides all the layout specifications needed to understand or recreate the YUSTAM Mobile Application interface. Each screen is carefully designed to provide an intuitive, native mobile experience.

**Need more details?** Check the actual component files in `src/screens/` for implementation code!

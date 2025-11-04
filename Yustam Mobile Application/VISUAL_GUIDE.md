# YUSTAM Mobile App - Visual Guide

## 🎨 Application Flow Diagram

```
┌─────────────────┐
│  App Launches   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Splash Screen   │──── 3 seconds animation
│  (YUSTAM Logo)  │──── Fade in + Scale
└────────┬────────┘
         │
         ▼
    Check State
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 First     Logged In
  Time        │
    │    ┌────┴─────┐
    │    │          │
    │  Buyer    Vendor
    │    │          │
    ▼    ▼          ▼
┌─────────────────────────────────┐
│    Onboarding (3 Slides)        │
│                                 │
│  Slide 1: Buy from Verified    │
│           Vendors               │
│           [Skip] [Next]         │
│                                 │
│  Slide 2: Sell Smarter &       │
│           Reach More            │
│           [Skip] [Next]         │
│                                 │
│  Slide 3: Join Nigeria's       │
│           Trusted Community     │
│           [Continue as Buyer]   │
│           [Continue as Vendor]  │
└────────────┬────────────────────┘
             │
        Select Role
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────────────────────────────┐
│     Authentication Screen       │
│                                 │
│  ┌──────────┬──────────┐       │
│  │  Login   │ Register │       │
│  └──────────┴──────────┘       │
│                                 │
│  Email: ________________        │
│  Password: _____________        │
│  [Forgot Password?]             │
│                                 │
│  [Sign In Button]               │
│                                 │
│  ─── or ───                     │
│                                 │
│  [🔵 Sign in with Google]      │
└────────────┬────────────────────┘
             │
        After Login
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────────────────────────────────────────┐
│         BUYER DASHBOARD                      │
│                                              │
│  📍 Lagos, Nigeria          🔔              │
│  ┌────────────────────────────────┐         │
│  │ 🔍 Search products...          │         │
│  └────────────────────────────────┘         │
│                                              │
│  ╔════════════════════════════════╗         │
│  ║  New Collection                ║         │
│  ║  Flash Sale 40% off            ║  🛍️    │
│  ║  [Shop Now]                    ║         │
│  ╚════════════════════════════════╝         │
│                                              │
│  Category                    [See All]       │
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ 📱   │ │ 💻   │ │ 📺   │ ...            │
│  │Phones│ │Laptop│ │ TVs  │                 │
│  └──────┘ └──────┘ └──────┘                │
│                                              │
│  Popular Now                 [See All]       │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ Image  │ │ Image  │ │ Image  │ ...      │
│  │ Name   │ │ Name   │ │ Name   │          │
│  │ ₦Price │ │ ₦Price │ │ ₦Price │          │
│  │ ⭐ 4.8 │ │ ⭐ 4.9 │ │ ⭐ 4.7 │          │
│  │[Order] │ │[Order] │ │[Order] │          │
│  └────────┘ └────────┘ └────────┘          │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │ 🏠   🔍   💬   🔔   👤           │   │
│  │Home Search Chat Notif Profile      │   │
│  └─────────────────────────────────────┘   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         VENDOR DASHBOARD                     │
│                                              │
│  ╔════════════════════════════════╗         │
│  ║  Vendor Dashboard              ║         │
│  ╚════════════════════════════════╝         │
│                                              │
│  ┌──────────────────────────────────┐       │
│  │  👤 Welcome back,                │       │
│  │     Adaeze Okafor               │       │
│  └──────────────────────────────────┘       │
│                                              │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  📦         │  │  💰         │          │
│  │  12         │  │  ₦450,000   │          │
│  │  Active     │  │  Total      │          │
│  │  Listings   │  │  Sales      │          │
│  └─────────────┘  └─────────────┘          │
│                                              │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  🎫         │  │  ✓          │          │
│  │  Premium    │  │  Verified   │          │
│  │  Plan Type  │  │  Status     │          │
│  └─────────────┘  └─────────────┘          │
│                                              │
│  Quick Actions                               │
│  ┌───────────────────────────────┐          │
│  │ 📝 Manage Listings        →  │          │
│  └───────────────────────────────┘          │
│  ┌───────────────────────────────┐          │
│  │ 💬 View Messages          →  │          │
│  └───────────────────────────────┘          │
│  ┌───────────────────────────────┐          │
│  │ 👤 Update Profile         →  │          │
│  └───────────────────────────────┘          │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │ 🏠   💬   📦   👤   ⚙️          │   │
│  │Home  Chat List Profile Settings     │   │
│  └─────────────────────────────────────┘   │
│                                     [+]      │
└──────────────────────────────────────────────┘
```

## 📱 Screen Layouts

### Splash Screen
```
╔══════════════════════════════╗
║                              ║
║                              ║
║        ┌──────────┐          ║
║        │          │          ║
║        │  YUSTAM  │          ║
║        │   LOGO   │          ║
║        │          │          ║
║        └──────────┘          ║
║                              ║
║         YUSTAM               ║
║   Nigeria's Trusted          ║
║      Marketplace             ║
║                              ║
║                              ║
╚══════════════════════════════╝
   ↓ Fade + Scale Animation
   ↓ 3 seconds
```

### Onboarding Slide Example
```
╔══════════════════════════════╗
║                      [Skip]  ║
║                              ║
║        ┌────────┐            ║
║        │        │            ║
║        │   🛡️   │            ║
║        │        │            ║
║        └────────┘            ║
║                              ║
║  Buy from Verified Vendors   ║
║                              ║
║  Shop with confidence from   ║
║  trusted sellers across      ║
║  Nigeria. Quality            ║
║  guaranteed, every time.     ║
║                              ║
║         • • ○                ║
║                              ║
║      [Next →]                ║
║                              ║
╚══════════════════════════════╝
```

### Authentication - Register Tab (Vendor)
```
╔══════════════════════════════╗
║  YUSTAM                      ║
║  Vendor Portal               ║
╠══════════════════════════════╣
║  [Login] [Create Account]   ║
╠══════════════════════════════╣
║                              ║
║  Full Name                   ║
║  ┌─────────────────────────┐║
║  │ Adaeze Okafor           │║
║  └─────────────────────────┘║
║                              ║
║  Email Address               ║
║  ┌─────────────────────────┐║
║  │ adaeze@yustam.com       │║
║  └─────────────────────────┘║
║                              ║
║  Phone Number                ║
║  ┌─────────────────────────┐║
║  │ 0801 234 5678           │║
║  └─────────────────────────┘║
║                              ║
║  Password                    ║
║  ┌─────────────────────────┐║
║  │ ••••••••                │║
║  └─────────────────────────┘║
║                              ║
║  Confirm Password            ║
║  ┌─────────────────────────┐║
║  │ ••••••••                │║
║  └─────────────────────────┘║
║                              ║
║  ✓ At least 6 characters    ║
║  ✓ Passwords match          ║
║                              ║
║  Business Name               ║
║  ┌─────────────────────────┐║
║  │ Lagoon Tech Hub         │║
║  └─────────────────────────┘║
║                              ║
║  Category                    ║
║  ┌─────────────────────────┐║
║  │ Electronics        ▼    │║
║  └─────────────────────────┘║
║                              ║
║  ☑ I agree to Terms         ║
║                              ║
║  [Create Account]            ║
║                              ║
╚══════════════════════════════╝
```

## 🎨 Color Palette

```
╔═══════════════╗  ╔═══════════════╗
║               ║  ║               ║
║   EMERALD     ║  ║    ORANGE     ║
║   #004D40     ║  ║   #F3731E     ║
║               ║  ║               ║
╚═══════════════╝  ╚═══════════════╝
    Primary            Accent

╔═══════════════╗  ╔═══════════════╗
║               ║  ║               ║
║    BEIGE      ║  ║    WHITE      ║
║   #EADCCF     ║  ║   #FFFFFF     ║
║               ║  ║               ║
╚═══════════════╝  ╚═══════════════╝
   Background         Surface
```

## 🔤 Typography Examples

```
╔══════════════════════════════════════╗
║                                      ║
║  YUSTAM  ← Anton, 42px, #004D40     ║
║          uppercase, letter-spacing   ║
║                                      ║
║  Vendor Dashboard  ← Anton, 28px    ║
║                                      ║
║  Welcome back, Adaeze  ← Inter 600  ║
║                           18px       ║
║                                      ║
║  Shop with confidence from  ← Inter ║
║  trusted sellers across     400,16px║
║  Nigeria.                            ║
║                                      ║
║  [Sign In]  ← Inter 600, 16px       ║
║                                      ║
╚══════════════════════════════════════╝
```

## 📦 Component Examples

### Category Card
```
┌──────────┐
│          │
│    📱    │  ← Icon (32px)
│          │
│  Phones  │  ← Label (12px, Inter 600)
└──────────┘
   90px width
```

### Product Card
```
┌────────────────┐
│                │
│    [Image]     │  140px height
│                │
├────────────────┤
│ iPhone 13 Pro  │  ← Name (14px)
│ ₦450,000       │  ← Price (16px, bold)
│ ⭐ 4.8 (124)   │  ← Rating (12px)
│                │
│ [Order Now]    │  ← Button
└────────────────┘
  180px width
```

### Summary Card (Vendor)
```
┌─────────────────┐
│                 │
│  ┌───┐          │
│  │📦 │          │  ← Icon in colored bg
│  └───┘          │
│                 │
│  12             │  ← Value (18px, bold)
│  Active         │  ← Label (12px)
│  Listings       │
│                 │
└─────────────────┘
```

## 📐 Spacing System

```
Extra Small:  4px   ││
Small:        8px   ││││
Medium:      16px   ││││││││
Large:       24px   ││││││││││││
Extra Large: 32px   ││││││││││││││││
```

## 🔘 Border Radius

```
Small:       8px   ╭─╮
Medium:     14px   ╭──╮
Large:      16px   ╭───╮
Extra:      20px   ╭────╮
Full:      999px   (──)
```

## 🎭 Shadows & Elevation

```
Card Shadow:
  color: rgba(0,0,0,0.08)
  blur: 10px
  offset: (0, 4)

Button Shadow:
  color: rgba(243,115,30,0.34)
  blur: 18px
  offset: (0, 8)
```

## 🔄 Animations

### Splash Screen
```
Fade: 0.0 → 1.0 (700ms, easeIn)
Scale: 0.5 → 1.0 (700ms, easeOutBack)
```

### Page Transitions
```
Duration: 300ms
Curve: easeInOut
```

### Button Hover
```
Transform: translateY(-2px)
Scale: 1.02
Duration: 250ms
```

---

© 2025 YUSTAM - Mobile App Visual Guide

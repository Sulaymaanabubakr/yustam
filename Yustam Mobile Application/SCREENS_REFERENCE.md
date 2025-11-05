# YUSTAM Mobile App - Screen Reference Guide

A visual reference guide describing what each screen looks like and its key elements.

---

## 1. Splash Screen

**Duration**: 2.5 seconds

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│         ┌─────────────┐         │
│         │             │         │
│         │  [YUSTAM]   │         │ ← Logo in white rounded card
│         │   LOGO      │         │   with shadow
│         │             │         │
│         └─────────────┘         │
│                                 │
│           YUSTAM                │ ← Anton font, emerald
│                                 │
│    Nigeria's Trusted            │ ← Inter font, gray
│        Marketplace              │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Animations**:
- Logo fades in (0 → 1 opacity)
- Logo scales up (0.8 → 1.0)
- Text fades in after logo

---

## 2. Onboarding Screen

### Slide 1: Buy from Verified Vendors

```
┌─────────────────────────────────┐
│              [Skip]              │ ← Top-right corner
│                                  │
│        ┌────────────┐            │
│        │            │            │
│        │  [Shield]  │            │ ← Large icon in beige circle
│        │            │            │
│        └────────────┘            │
│                                  │
│   Buy from Verified Vendors     │ ← Anton, emerald, bold
│                                  │
│   Shop with confidence from      │ ← Inter, gray, smaller
│   trusted sellers across         │
│   Nigeria. Every vendor is       │
│   verified for your safety.      │
│                                  │
│        ● ○ ○                     │ ← Pagination dots
│                                  │
│      [Next →]                    │ ← Orange button
└─────────────────────────────────┘
```

### Slide 3: Role Selection

```
┌─────────────────────────────────┐
│                                  │
│   Join Nigeria's Trusted         │ ← Anton, emerald
│       Marketplace                │
│                                  │
│   A safe, vibrant community...   │
│                                  │
│      Continue As                 │ ← Anton, emerald, bold
│                                  │
│  ┌──────────────────────────┐   │
│  │     ┌────────┐           │   │
│  │     │ [Bag]  │  Buyer    │   │ ← Beige card, white icon
│  │     └────────┘           │   │   circle, emerald text
│  │  Browse and shop         │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │   ┌────────┐             │   │
│  │   │[Store] │  Vendor     │   │ ← Beige card, white icon
│  │   └────────┘             │   │   circle, orange text
│  │  Sell and grow           │   │
│  └──────────────────────────┘   │
│                                  │
│  Chose wrong? Change in Settings │ ← Small gray text
└─────────────────────────────────┘
```

---

## 3. Authentication Screen

```
┌─────────────────────────────────┐
│                                  │
│         [YUSTAM LOGO]            │ ← 80x80 rounded image
│            YUSTAM                │ ← Anton, emerald
│                                  │
│  ┌────────────┬────────────┐    │
│  │   Login    │   Create   │    │ ← Tab switcher (white bg)
│  │  [Active]  │  Account   │    │   Active = orange
│  └────────────┴────────────┘    │
│                                  │
│ ┌──────────────────────────────┐│
│ │                              ││
│ │  Email Address               ││
│ │  [mail icon] email@...       ││ ← White input with icon
│ │                              ││
│ │  Password                    ││
│ │  [lock icon] ••••••• [eye]   ││ ← Toggle visibility
│ │                              ││
│ │         Forgot Password?     ││ ← Orange link
│ │                              ││
│ │      [Login]                 ││ ← Orange button, full width
│ │                              ││
│ │      ─── OR ───              ││
│ │                              ││
│ │  [G] Sign in with Google     ││ ← White with border
│ │                              ││   Official Google icon
│ └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Register Tab** (Additional Fields for Vendors):
- Business Name input
- Category dropdown (12 options)
- Terms & Conditions checkbox

---

## 4. Home Screen

```
┌─────────────────────────────────┐
│ ═════════════════════════════   │ ← Safe area top
│                                  │
│  Everything you need – all in    │ ← Anton, 3xl, emerald
│  one trusted marketplace         │
│                                  │
│  Buy and sell safely...          │ ← Inter, gray
│                                  │
│ ┌──────────────────────────────┐│
│ │ [📍] All Nigeria [v]         ││ ← Location selector
│ │                              ││
│ │ [🔍] Search iPhone 13...     ││ ← Search input
│ │                              ││
│ │      [Search]                ││ ← Orange button
│ └──────────────────────────────┘│ ← White card with shadow
│                                  │
│  ┌─────────────────────────┐    │ ← Flash sale carousel
│  │ New Collection          │    │   (swipeable)
│  │ Flash Sale up to 40%    │    │   Orange gradient bg
│  │ [Shop Now →]            │    │
│  └─────────────────────────┘    │
│                                  │
│  Browse by Categories           │ ← Anton, 2xl, emerald
│  Discover a vibrant mix...      │
│                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐    │ ← 3-column grid
│  │ [📱] │ │ [💻] │ │ [👔] │    │   Beige cards
│  │Phone │ │Elect │ │Fashion│   │   White icon circles
│  └──────┘ └──────┘ └──────┘    │   Anton labels
│                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ [🏠] │ │ [🚗] │ │ [💄] │    │
│  │Home  │ │Vehicle││Beauty │    │
│  └──────┘ └──────┘ └──────┘    │
│                                  │
│  Featured Listings              │ ← Anton, 2xl, emerald
│  Popular items from verified... │
│                                  │
│ ┌───────┐┌───────┐┌───────┐    │ ← Horizontal scroll
│ │ [IMG] ││ [IMG] ││ [IMG] │    │   Product cards
│ │       ││  [✓]  ││       │    │   Verified badge
│ │iPhone ││Samsung││MacBook│    │
│ │₦450k  ││₦280k  ││₦850k  │    │ ← Orange price
│ │Lagos  ││Abuja  ││PH     │    │
│ │[View] ││[View] ││[View] │    │ ← Orange button
│ └───────┘└───────┘└───────┘    │
│                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │ ← Bottom tabs
│ [🏠] [🔍] [💬] [🔔] [👤]       │
│ Home Search Chat Notif Profile  │
└─────────────────────────────────┘
                  [+]              ← Vendor FAB (orange)
```

---

## 5. Search Screen

```
┌─────────────────────────────────┐
│ Search                           │ ← Anton, header
├─────────────────────────────────┤
│                                  │
│ [🔍] What are you looking for?   │ ← Large search input
│                                  │
│ Filters                          │ ← Anton, section title
│                                  │
│ Category                         │
│ ┌──────────────────────────────┐│
│ │ All Categories         [▼]   ││ ← Dropdown
│ └──────────────────────────────┘│
│                                  │
│ Location                         │
│ ┌──────────────────────────────┐│
│ │ All Nigeria            [▼]   ││ ← Dropdown (37 states)
│ └──────────────────────────────┘│
│                                  │
│ Price Range                      │
│ ┌─────────┐  ─  ┌─────────┐    │
│ │   Min   │     │   Max   │    │ ← Min/Max inputs
│ └─────────┘     └─────────┘    │
│                                  │
│      [Apply Filters]             │ ← Orange button
│                                  │
│ Enter search query to see...     │ ← Placeholder text
│                                  │
├─────────────────────────────────┤
│ [🏠] [🔍] [💬] [🔔] [👤]       │ ← Bottom tabs
└─────────────────────────────────┘
```

---

## 6. Chat Screen (Shell)

```
┌─────────────────────────────────┐
│ Messages                         │ ← Anton, header
├─────────────────────────────────┤
│                                  │
│                                  │
│           [💬]                   │ ← Large icon
│                                  │
│      No messages yet             │ ← Bold text
│                                  │
│   Start a conversation with      │ ← Gray text
│   vendors by contacting them     │
│   from product listings          │
│                                  │
│                                  │
├─────────────────────────────────┤
│ [🏠] [🔍] [💬] [🔔] [👤]       │ ← Bottom tabs
└─────────────────────────────────┘
```

---

## 7. Notifications Screen (Shell)

```
┌─────────────────────────────────┐
│ Notifications                    │ ← Anton, header
├─────────────────────────────────┤
│                                  │
│                                  │
│           [🔔]                   │ ← Large icon
│                                  │
│      No notifications            │ ← Bold text
│                                  │
│   You'll see updates about       │ ← Gray text
│   your orders, messages, and     │
│   account activity here          │
│                                  │
│                                  │
├─────────────────────────────────┤
│ [🏠] [🔍] [💬] [🔔] [👤]       │ ← Bottom tabs
└─────────────────────────────────┘
```

---

## 8. Profile Screen

```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │ ← Beige header section
│ │                           │   │
│ │       ┌─────────┐         │   │
│ │       │ [Photo] │         │   │ ← Avatar (100x100)
│ │       └─────────┘         │   │   or placeholder
│ │                           │   │
│ │    John Doe               │   │ ← Anton, emerald
│ │    john@example.com       │   │ ← Inter, gray
│ │                           │   │
│ │    [🛍️ Buyer]            │   │ ← Role badge (orange pill)
│ └───────────────────────────┘   │
│                                  │
│ [✏️]  Edit Profile              │ ← Menu items
│ [❤️]  Saved Items               │   (white background)
│ [🔄]  Switch Role    [vendor]   │ ← Badge showing current
│                                  │
│ Settings                         │ ← Gray uppercase label
│ [🔒]  Change Password            │
│ [🔔]  Notifications              │
│ [🌐]  Language                   │
│                                  │
│ Support                          │
│ [❓]  Help & Support             │
│ [🛡️]  Privacy Policy            │
│ [📄]  Terms & Conditions         │
│                                  │
│      [Logout]                    │ ← Outline button (orange)
│                                  │
│       Version 1.0.0              │ ← Gray small text
│                                  │
├─────────────────────────────────┤
│ [🏠] [🔍] [💬] [🔔] [👤]       │ ← Bottom tabs
└─────────────────────────────────┘
```

---

## Design Patterns Used

### Colors
- **Emerald (#004D40)**: Headers, titles, primary text
- **Orange (#F3731E)**: Buttons, CTAs, highlights, active states
- **Beige (#EADCCF)**: Card backgrounds, section dividers
- **White (#FFFFFF)**: Main backgrounds, input fields
- **Gray**: Secondary text, icons

### Typography
- **Anton**: All headings, section titles, button labels
  - Sizes: 2xl (24px), 3xl (28px), 5xl (40px)
  - Always uppercase or title case
  - Tight letter spacing (0.4px)
  
- **Inter**: Body text, input text, descriptions
  - Weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
  - Sizes: xs (12px), sm (14px), base (16px), lg (18px)

### Spacing
- **8-point grid**: 4, 8, 12, 16, 20, 24, 32, 40, 48px
- **Card padding**: 16-24px
- **Section gaps**: 24-32px
- **Element gaps**: 8-16px

### Shadows
- **Soft**: Cards, inputs (0 4px 12px rgba(0,0,0,0.08))
- **Medium**: Buttons (0 8px 16px rgba(0,0,0,0.12))
- **Strong**: FAB, modals (0 10px 24px rgba(0,0,0,0.18))

### Border Radius
- **Small (8px)**: Tags, badges
- **Medium (12-16px)**: Inputs, buttons, small cards
- **Large (20-24px)**: Main cards, sections
- **Full**: Circles (profile photos, icons, pills)

### Icons
- **Ionicons** throughout
- **Sizes**: 16px (small), 20-24px (medium), 32px (large), 80px (empty states)
- **Colors**: Match text color or accent (orange/emerald)

---

## Interaction Patterns

### Touch Targets
- Minimum 44x44 points for all tappable elements
- Buttons: 48-56px height
- Tabs: 60px height
- Spacing between elements: 8-16px

### Feedback
- **Tap**: Button scales slightly (activeOpacity: 0.7-0.8)
- **Focus**: Input border changes to orange, 2px width
- **Error**: Red border, error icon + text below
- **Success**: Green toast notification at top
- **Loading**: Spinner replaces button text

### Animations
- **Screen transitions**: Smooth slide (200-300ms)
- **Card appearance**: Fade + scale (300ms)
- **Toast**: Slide from top + fade (300ms in, 200ms out)
- **Carousel**: Auto-slide every 5s, manual swipe enabled
- **FAB**: Always visible, slight shadow on press

---

## Responsive Behavior

### Small Screens (< 375px)
- Font sizes scale down slightly
- Padding reduces to 16px
- 3-column category grid maintained
- Flash sale cards width: 80% of screen

### Medium Screens (375-414px)
- Standard sizing
- Optimal layout

### Large Screens (> 414px)
- Max container width maintained
- Extra whitespace on sides
- Category cards can expand slightly

---

## Accessibility

### Screen Readers
- All icons have descriptive labels
- Inputs have proper labels
- Buttons have clear text

### Contrast
- Text colors meet WCAG AA standards
- Button colors provide clear contrast
- Error states clearly visible

### Touch Targets
- All interactive elements minimum 44x44
- Clear spacing between elements
- Large tap areas for important actions

---

**This reference guide visually describes all implemented screens. For code details, see the source files in `src/screens/`.**

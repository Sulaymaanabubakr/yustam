# 💼 Yustam Admin Dashboard (Flutter Web)

> **Enterprise-grade admin panel with full RBAC and mobile responsiveness**

[![Flutter](https://img.shields.io/badge/Flutter-Web-02569B?logo=flutter)](https://flutter.dev)
[![Responsive](https://img.shields.io/badge/Responsive-Mobile%20%7C%20Tablet%20%7C%20Desktop-success)](https://flutter.dev)

---

## 🎯 Overview

The **Yustam Admin Dashboard** is a fully responsive, enterprise-grade administration panel built with Flutter Web. It provides complete control over the marketplace with role-based access control (RBAC), audit logging, and advanced analytics.

### Key Features
- 👥 **Staff Management**: Create/edit admin accounts with custom roles
- 🔐 **RBAC**: Granular permissions for every action
- 📊 **Analytics**: Revenue, user growth, engagement charts
- ✅ **Listing Moderation**: Approve, reject, delete listings
- 🏪 **Vendor Management**: View, edit, suspend vendors
- 🎫 **Support Tickets**: Manage customer support
- 📝 **Audit Log**: Track all admin actions
- 💳 **Paystack Transactions**: Detailed payment logs
- 📱 **Fully Responsive**: Perfect on mobile, tablet, desktop

---

## 🛠️ Tech Stack

- **Framework**: Flutter Web
- **State Management**: Riverpod 3.0
- **Navigation**: go_router
- **Backend**: Supabase (REST API + Realtime)
- **Charts**: fl_chart
- **Tables**: data_table_2
- **Exports**: csv, excel
- **UI**: Material Design 3 + Custom components

---

## 📁 Project Structure

```
yustam-admin/
├── lib/
│   ├── main.dart
│   ├── config/
│   │   ├── env.dart
│   │   ├── theme.dart
│   │   └── routes.dart
│   ├── core/
│   │   ├── providers/
│   │   ├── services/
│   │   └── utils/
│   ├── features/
│   │   ├── auth/              # Admin login
│   │   ├── dashboard/         # Overview
│   │   ├── listings/          # Manage listings
│   │   ├── vendors/           # Manage vendors
│   │   ├── buyers/            # Manage buyers
│   │   ├── verifications/     # Verification requests
│   │   ├── support/           # Support tickets
│   │   ├── staff/             # Staff & RBAC
│   │   ├── analytics/         # Charts & reports
│   │   ├── transactions/      # Paystack logs
│   │   └── settings/          # Admin settings
│   └── shared/
│       ├── widgets/
│       └── models/
├── web/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.png
├── pubspec.yaml
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.38.1 or higher
- Chrome browser (for development)
- Supabase account with admin credentials

### Installation

1. **Install dependencies**
```bash
flutter pub get
```

2. **Configure environment**
Create `lib/config/env.dart`:
```dart
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const ADMIN_EMAIL = 'admin@yustam.com.ng';
```

3. **Run in development**
```bash
flutter run -d chrome --web-port=8080
```

4. **Build for production**
```bash
flutter build web --release
```

---

## 📦 Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^3.0.0
  go_router: ^14.0.0
  supabase_flutter: ^2.8.0
  fl_chart: ^0.68.0
  data_table_2: ^2.5.0
  csv: ^6.0.0
  excel: ^4.0.0
  intl: ^0.19.0
  file_saver: ^0.2.0
  responsive_framework: ^1.4.0
```

---

## 🔐 Role-Based Access Control (RBAC)

### Predefined Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access to everything |
| **Moderator** | Manage listings, verifications |
| **Finance** | View transactions, manage subscriptions |
| **Support** | Manage support tickets, view users |
| **Analyst** | View analytics, export reports |

### Custom Roles
Admins can create custom roles with granular permissions:
- View/Edit/Delete Listings
- Approve/Reject Verifications
- Manage Vendors
- Manage Buyers
- View Transactions
- Manage Staff
- View Audit Log
- Export Data

### Implementation
```dart
final permissions = {
  'listings.view': true,
  'listings.edit': true,
  'listings.delete': false,
  'vendors.suspend': true,
  'staff.manage': false,
};

// Check permission before action
if (!hasPermission('listings.delete')) {
  showError('Insufficient permissions');
  return;
}
```

---

## 📊 Dashboard Screens

### 1. Overview Dashboard
- Total users, vendors, listings
- Revenue chart (last 30 days)
- Recent activity feed
- Quick actions

### 2. Listings Management
- Table with filters (status, category, vendor)
- Bulk actions (approve, reject, delete)
- Listing detail modal
- Image gallery

### 3. Vendor Management
- Vendor list with search
- Vendor detail page
- Subscription history
- Suspend/unsuspend actions

### 4. Verification Requests
- Pending requests queue
- Document viewer
- Approve/reject with feedback
- Status tracking

### 5. Support Tickets
- Ticket list with filters
- Ticket detail with message thread
- Assign to staff
- Close/reopen tickets

### 6. Staff Management
- Admin accounts list
- Create/edit admin
- Assign roles
- View activity log

### 7. Analytics
- Revenue trends (line chart)
- User growth (area chart)
- Category distribution (pie chart)
- Engagement metrics (bar chart)
- Export to CSV/Excel

### 8. Paystack Transactions
- Transaction log table
- Filter by date, status, vendor
- Refund actions
- Export to CSV

### 9. Audit Log
- All admin actions logged
- Filter by admin, action type, date
- Export to CSV

---

## 🎨 Design System

### Responsive Breakpoints
```dart
const breakpoints = {
  'mobile': 0,      // 0-600px
  'tablet': 600,    // 600-1024px
  'desktop': 1024,  // 1024px+
};
```

### Layout
- **Mobile**: Single column, hamburger menu
- **Tablet**: Sidebar + main content
- **Desktop**: Sidebar + main content + right panel (optional)

### Color Palette
```dart
primaryColor: Color(0xFFF3731E),      // Orange
secondaryColor: Color(0xFF0F6A53),    // Emerald
backgroundColor: Color(0xFFF8F9FA),
surfaceColor: Color(0xFFFFFFFF),
errorColor: Color(0xFFDC2626),
successColor: Color(0xFF10B981),
warningColor: Color(0xFFF59E0B),
```

---

## 📱 Mobile Optimization

### Features
- Touch-friendly buttons (min 48x48px)
- Swipe gestures for actions
- Bottom sheet modals
- Collapsible sidebar
- Responsive tables (horizontal scroll)
- Optimized charts for small screens

### Example
```dart
Widget build(BuildContext context) {
  final isMobile = MediaQuery.of(context).size.width < 600;
  
  return isMobile
    ? MobileLayout(child: content)
    : DesktopLayout(sidebar: sidebar, content: content);
}
```

---

## 🔍 Search & Filters

### Listings
- Text search (title, description)
- Filter by: Status, Category, Vendor, Date range
- Sort by: Newest, Oldest, Price, Views

### Vendors
- Text search (name, email)
- Filter by: Plan, Verification status, Date joined
- Sort by: Newest, Name, Revenue

### Transactions
- Filter by: Date range, Status, Vendor, Amount range
- Sort by: Date, Amount

---

## 📤 Export Features

### CSV Export
```dart
final csvData = convertToCSV(data);
FileSaver.instance.saveFile(
  name: 'listings_export_${DateTime.now()}.csv',
  bytes: utf8.encode(csvData),
);
```

### Excel Export
```dart
final excel = Excel.createExcel();
final sheet = excel['Listings'];
// Add data...
FileSaver.instance.saveFile(
  name: 'listings_export_${DateTime.now()}.xlsx',
  bytes: excel.encode()!,
);
```

---

## 🔔 Real-time Updates

### Supabase Realtime
```dart
// Listen for new listings
supabase
  .from('listings')
  .stream(primaryKey: ['id'])
  .listen((data) {
    // Update UI
    ref.read(listingsProvider.notifier).refresh();
  });
```

---

## 🧪 Testing

```bash
# Run tests
flutter test

# Integration tests
flutter drive --target=test_driver/app.dart --driver=test_driver/integration_test.dart
```

---

## 🚀 Deployment

### Build
```bash
flutter build web --release --web-renderer canvaskit
```

### Deploy to Hosting
```bash
# Firebase Hosting
firebase deploy --only hosting

# Vercel
vercel deploy

# Netlify
netlify deploy --prod --dir=build/web
```

### Environment Variables
Set in hosting platform:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_EMAIL`

---

## 📄 License

Copyright © 2025 Yustam Marketplace. All rights reserved.

---

**Enterprise-grade admin panel, accessible anywhere 🚀**

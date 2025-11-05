# YUSTAM Vendor Feature Mapping: Web → Mobile

This document maps every vendor web file to its mobile implementation, ensuring complete feature parity between the YUSTAM web vendor dashboard and the mobile application.

## Legend
- ✅ **Fully Implemented**: Feature fully working in mobile app
- ⚠️ **Partially Implemented**: Core functionality present, some features missing
- ❌ **Not Implemented**: Feature missing from mobile app
- 🔄 **Shared**: Functionality shared between buyer and vendor roles

---

## Authentication & Authorization

### vendor-login.html
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/auth/AuthScreen.js` + `LoginForm.js`  
**Description**: Login form for vendors with email/password and Google OAuth. Mobile handles both buyer and vendor login in same screen with role detection.  
**API**: `login.php`, `vendor-google-login.php`

### vendor-login.js
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/auth/LoginForm.js`  
**Description**: Client-side login logic, form validation, error handling. Mobile uses React state management and AuthContext.  
**API**: Same as web

### vendor-register.html
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/auth/AuthScreen.js` + `RegisterForm.js`  
**Description**: Registration form with business name, category, email, password. Mobile has category dropdown and terms checkbox.  
**API**: `signup.php`

### vendor-register.js
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/auth/RegisterForm.js`  
**Description**: Client-side registration validation and submission logic.  
**API**: Same as web

---

## Dashboard & Analytics

### vendor-dashboard.php
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/vendor/VendorDashboardScreen.js`  
**Description**: Main vendor dashboard showing stats, quick actions, recent listings. Mobile version has core dashboard with listing counts, views, messages, notifications, plan info. Missing: detailed charts/graphs from web.  
**API**: `vendor-dashboard.php?format=json`  
**Missing Features**:
- Revenue/earnings charts
- Detailed traffic analytics
- Conversion metrics

### vendor-dashboard.js
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/vendor/VendorDashboardScreen.js`  
**Description**: Interactive dashboard elements, chart rendering, data updates. Mobile has pull-to-refresh and quick action cards.  
**API**: Same as web

### AnalyticsScreen.js (Mobile-Specific Enhancement)
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/AnalyticsScreen.js`  
**Description**: Additional analytics view showing listing metrics, plan usage, verification status, approval rates. More detailed than basic dashboard.  
**API**: `vendor-dashboard.php?format=json`

---

## Listings Management

### vendor-listings.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Page showing all vendor listings with filters (status, search, sort), pagination, bulk actions.  
**API**: `vendor-listings-data.php`  
**Required Features**:
- List all listings with thumbnail, title, price, status, views
- Filter by status (all, approved, pending, draft, sold, archived)
- Search by keyword
- Sort by date, price, views
- Pull-to-refresh
- Pagination/infinite scroll
- Quick actions: Edit, Delete, Duplicate

### vendor-listings.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Client-side listing management: search, filter, sort, edit/delete actions, pagination.  
**API**: Same as above

### vendor-listings-data.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Backend endpoint returning listing data for vendor (JSON format).  
**API**: `vendor-listings-data.php?format=json&page=1&per_page=20&status=all&search=&sort=recent`

### vendor-listing-editor.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Listing create/edit modal with form fields: title, description, price, category, subcategory, location, condition, images. Uses Cloudinary for image upload.  
**Required Features**:
- Create new listing
- Edit existing listing
- Image upload (multiple images via Cloudinary)
- Category/subcategory selection
- Location/state selection
- Price input with currency formatting
- Condition dropdown (New, Used, Refurbished)
- Status selection (Draft, Approved, Unlisted, Sold, Archived)
- Form validation

### vendor-listing-editor-modal.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION** (as modal or separate screen)  
**Description**: HTML structure for listing editor modal.

### vendor-listing-update.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Backend endpoint for creating/updating listing.  
**API**: `POST vendor-listing-update.php` with FormData including images, title, description, price, etc.

### vendor-listing-sync.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Sync listing between MySQL and Firestore. Mobile should call this after creating/updating.  
**API**: `POST vendor-listing-sync.php?listingId={id}`

### vendor-listing-delete.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Delete listing from both MySQL and Firestore.  
**API**: `POST vendor-listing-delete.php` with listingId parameter  
**Required Features**:
- Confirmation dialog before delete
- Success/error feedback
- Refresh listing list after delete

---

## Profile Management

### vendor-profile.php
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/shared/ProfileScreen.js` (shows basic info, menu items)  
**Description**: Vendor profile view with business info, stats, verification badge. Mobile shows name, email, role badge, menu items.  
**API**: None (static display from AuthContext)  
**Missing Features**:
- Detailed business information display
- Public profile preview
- Stats summary

### vendor-profile.js
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/shared/ProfileScreen.js`  
**Description**: Profile interactions and navigation.

### vendor-edit-profile.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Edit profile page with form for name, email, phone, business name, business address, state, profile photo upload.  
**API**: Loads from vendor session, displays current values  
**Required Features**:
- Form with all vendor profile fields
- Profile photo upload via Cloudinary
- Photo preview
- Form validation
- Save button with loading state

### vendor-edit-profile.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Client-side profile editing logic, photo upload, form submission.  
**API**: Uses `uploadToCloudinary()` from cloudinary.js, then `update-vendor-profile.php`

### update-vendor-profile.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Backend endpoint to save vendor profile changes.  
**API**: `POST update-vendor-profile.php` with name, business_name, phone, state, business_address, profile_photo

---

## Settings

### vendor-settings.php
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/vendor/SettingsScreen.js`  
**Description**: Settings page with notification preferences, privacy settings, account actions. Mobile has toggles for push/email/SMS notifications, notification preferences, privacy toggles, 2FA toggle, account actions.  
**API**: Loads settings from session  
**Missing Features**:
- Actual persistence of settings to backend
- Email preferences (currently mock)
- Advanced privacy controls from web

### vendor-settings.js
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/vendor/SettingsScreen.js`  
**Description**: Settings interactions, toggle handlers.  
**API**: Should call `update-vendor-settings.php`

### update-vendor-settings.php
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/vendor/SettingsScreen.js` (has TODO for API call)  
**Description**: Backend endpoint to save vendor settings.  
**API**: `POST update-vendor-settings.php` with notification preferences, privacy settings  
**Status in Mobile**: Has UI, needs to actually call this endpoint

---

## Notifications

### vendor-notifications.php
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/VendorNotificationsScreen.js`  
**Description**: Notifications page showing listing approvals, rejections, messages, plan alerts, verification updates.  
**API**: `vendor-notifications-data.php?format=json`

### vendor-notifications.js
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/VendorNotificationsScreen.js`  
**Description**: Notification filtering (all/unread/read), mark as read, clear all. Mobile has all these features plus pull-to-refresh.  
**API**: Same as web

### vendor-notifications-data.php
**Status**: ✅ Fully Implemented (uses mock data, needs real API)  
**Mobile**: `src/screens/vendor/VendorNotificationsScreen.js`  
**Description**: Backend endpoint returning vendor notifications as JSON.  
**API**: `vendor-notifications-data.php?format=json`  
**Note**: Mobile uses mock data currently, needs to connect to real endpoint

---

## Chats & Messaging

### vendor-chats.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Chat list page showing all conversations with buyers. Each chat shows buyer name, last message preview, timestamp, unread count.  
**API**: Firebase Firestore for chat data

### vendor-chats.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Real-time chat list with Firestore subscriptions, typing indicators, message previews. Uses Firebase SDK.  
**API**: Firebase Firestore queries, `chat-service.js` utilities  
**Required Features**:
- List all vendor chat threads
- Real-time updates via Firestore
- Unread message count per chat
- Last message preview
- Typing indicators
- Navigate to chat thread detail
- Pull-to-refresh

### Chat Thread Detail
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Individual chat conversation view with message history, send message, image attachments.  
**API**: `api/chat/list-messages.php`, `api/chat/send-message.php`, Firebase

---

## Billing & Payments

### vendor-billing-history.php
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/BillingHistoryScreen.js`  
**Description**: Billing history page showing all transactions with plan name, amount, date, status, payment method, reference.  
**API**: `vendor-billing-history.php?format=json`

### vendor-billing-history.js
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/BillingHistoryScreen.js`  
**Description**: Transaction list with summary stats, quick actions (renew/upgrade plan). Mobile has all features plus pull-to-refresh.  
**API**: Same as web

---

## Plans & Subscriptions

### vendor-plans.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Plans page showing all available subscription plans with features, pricing, comparison. Shows current plan, allows upgrade/downgrade.  
**API**: Loads plan data from database  
**Required Features**:
- Display all available plans (Free, Basic, Premium, Professional)
- Plan comparison table with features
- Current plan highlighted
- "Upgrade" or "Select Plan" buttons
- Plan benefits list
- Pricing in Nigerian Naira
- Navigate to payment flow

### vendor-plans.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Plan selection logic, comparison interactions, upgrade flow.  
**API**: Payment gateway integration (Paystack)

### vendor-subscriptions.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Current subscription details page with plan info, expiry date, usage stats, renewal options.  
**API**: Loads subscription data from vendor record  
**Required Features**:
- Current plan name and status
- Expiry date
- Usage: listings used vs. allowed
- Plan benefits
- Auto-renewal status
- Cancel subscription button
- Renew/extend button

### vendor-renew-plan.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Plan renewal page with plan selection, duration options, payment.  
**API**: `vendor-renew-plan.php` processes renewal

### vendor-renew-plan.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Renewal flow logic, payment integration.  
**API**: Paystack payment gateway

### vendor-subscription-action.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Handle subscription actions: renew, cancel, upgrade, downgrade.  
**API**: `POST vendor-subscription-action.php` with action parameter

---

## Verification

### vendor-verification.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Verification application page with document upload forms: CAC certificate, ID front/back, proof of address, business logo.  
**API**: Loads current verification status  
**Required Features**:
- Verification status display (Not Submitted, Pending, Verified, Rejected)
- Document upload forms (5 fields)
- File preview for images/PDFs
- Upload progress indicators
- Submit button
- Resubmit for rejected applications

### vendor-verification.js
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Document upload logic, file preview, form submission, status polling.  
**API**: `verify.php` for submission, `vendor-verification-status.php` for status check  
**Technical Notes**:
- Use expo-image-picker for document selection
- Upload to Cloudinary
- Store Cloudinary URLs in database
- Show upload progress

### vendor-verification-status.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: API endpoint returning current verification status and submitted documents.  
**API**: `vendor-verification-status.php?format=json`

### verify.php
**Status**: ❌ Not Implemented  
**Mobile**: **NEEDS IMPLEMENTATION**  
**Description**: Process verification submission with document URLs.  
**API**: `POST verify.php` with document URLs and vendor info

### verification-badge.php
**Status**: ⚠️ Partially Implemented  
**Mobile**: UI component showing verified badge (can be added to profile, storefront)  
**Description**: Displays verification badge icon/label. Mobile can show badge in ProfileScreen, StorefrontScreen.  
**Status in Mobile**: Has concept, needs consistent badge component

### verification-badge.js
**Status**: ⚠️ Partially Implemented  
**Mobile**: Can create reusable component  
**Description**: JavaScript for badge rendering logic.

### verification-badges.css
**Status**: ✅ Fully Implemented (as React Native styles)  
**Mobile**: Styled with React Native StyleSheet  
**Description**: Badge styling - colors, icons, states.

---

## Storefront

### vendor-storefront.php
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/StorefrontScreen.js`  
**Description**: Public vendor storefront showing profile, stats, active listings. Mobile has cover image, profile photo, verification badge, business info, stats, listings grid, share button.  
**API**: `vendor-storefront-data.php?vendor_id={id}`

### vendor-storefront.js
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/StorefrontScreen.js`  
**Description**: Storefront interactions, share functionality. Mobile uses native Share API.  
**API**: Same as web

### vendor-storefront-data.php
**Status**: ✅ Fully Implemented (uses mock data, needs real API)  
**Mobile**: `src/screens/vendor/StorefrontScreen.js`  
**Description**: Backend endpoint returning vendor storefront data.  
**API**: `vendor-storefront-data.php?vendor_id={id}&format=json`  
**Note**: Mobile uses mock data currently, needs to connect to real endpoint

### vendor-storefront-cache.php
**Status**: N/A (Backend optimization)  
**Mobile**: Not applicable  
**Description**: Caching mechanism for storefront data. Mobile can benefit from this via API.

### vendor-storefront-cache-warm.php
**Status**: N/A (Backend utility)  
**Mobile**: Not applicable  
**Description**: Pre-warm cache for popular storefronts.

---

## Account Management

### vendor-delete-account.php
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/screens/vendor/SettingsScreen.js` (has Delete Account button in Danger Zone)  
**Description**: Delete account page with warning messages, confirmation, password verification.  
**API**: `POST vendor-delete-account.php` with password confirmation  
**Status in Mobile**: Has UI button with confirmation dialog, needs to implement actual API call with password verification

---

## Help & Support

### HelpSupportScreen.js (Mobile Implementation)
**Status**: ✅ Fully Implemented  
**Mobile**: `src/screens/vendor/HelpSupportScreen.js`  
**Description**: Help page with FAQ section (8 common questions), quick action cards, contact form, support information. No direct web equivalent, but provides support features.  
**API**: `send-email.php` for contact form

---

## Utility Files

### theme-manager.js
**Status**: ✅ Fully Implemented (as React Native theme)  
**Mobile**: `src/theme/index.js`, `colors.js`, `typography.js`, `spacing.js`  
**Description**: Theme/styling utilities. Mobile uses theme system with same color palette, typography (Anton + Inter), spacing scale.

### cloudinary.js
**Status**: ⚠️ Partially Implemented  
**Mobile**: `src/config/cloudinary.js`  
**Description**: Cloudinary upload utility for images. Mobile has config but needs full implementation for expo-image-picker integration.  
**API**: Cloudinary API with preset and cloud name

---

## Summary Statistics

### Implementation Status
- **Fully Implemented**: 13 features ✅
- **Partially Implemented**: 9 features ⚠️
- **Not Implemented**: 23 features ❌

### Critical Missing Features (Priority Order)

#### Priority 1: Core Functionality
1. **Listings Management** (vendor-listings.*, vendor-listing-editor.*, vendor-listing-update.php, vendor-listing-delete.php)
   - This is THE core vendor feature - vendors cannot function without it
   - Create, edit, delete, view listings
   - Image upload via Cloudinary
   - Status management

2. **Vendor Chats** (vendor-chats.*, Firebase integration)
   - Critical for buyer-vendor communication
   - Real-time messaging
   - Firestore integration

3. **Edit Profile** (vendor-edit-profile.*, update-vendor-profile.php)
   - Vendors need to update business info
   - Photo upload

#### Priority 2: Essential Business Features
4. **Plans & Subscriptions** (vendor-plans.*, vendor-subscriptions.php, vendor-renew-plan.*)
   - Required for monetization
   - Upgrade/downgrade plans
   - Payment integration

5. **Verification** (vendor-verification.*, verify.php)
   - Trust and credibility feature
   - Document uploads
   - Status tracking

#### Priority 3: Account & Settings
6. **Settings Backend Integration** (update-vendor-settings.php)
   - UI exists, needs API connection

7. **Delete Account** (vendor-delete-account.php)
   - UI exists, needs API implementation with password verification

8. **Profile Display** (vendor-profile.php enhancements)
   - More detailed profile view

---

## Next Steps

To achieve complete feature parity:

1. **Implement Listings Management** (highest priority)
   - Create `VendorListingsScreen.js`
   - Create `ListingEditorScreen.js` or `ListingEditorModal.js`
   - Connect to `vendor-listings-data.php`
   - Implement create/edit/delete flows
   - Cloudinary image upload integration

2. **Implement Vendor Chats**
   - Create `VendorChatsScreen.js`
   - Create `ChatThreadScreen.js`
   - Firebase Firestore integration
   - Real-time message updates

3. **Implement Edit Profile**
   - Create `EditProfileScreen.js`
   - Profile photo upload
   - Connect to `update-vendor-profile.php`

4. **Implement Plans & Subscriptions**
   - Create `PlansScreen.js`
   - Create `SubscriptionDetailsScreen.js`
   - Create `RenewPlanScreen.js`
   - Paystack payment integration

5. **Implement Verification**
   - Create `VerificationScreen.js`
   - Document picker integration
   - Upload to Cloudinary
   - Connect to `verify.php`

6. **Complete Partial Implementations**
   - Connect SettingsScreen to `update-vendor-settings.php`
   - Connect StorefrontScreen to real `vendor-storefront-data.php`
   - Connect NotificationsScreen to real `vendor-notifications-data.php`
   - Connect BillingHistoryScreen to real `vendor-billing-history.php`
   - Implement delete account with password verification

7. **Navigation Updates**
   - Add all new screens to AppNavigator
   - Add navigation from Dashboard and Profile
   - Add FAB for "Add Listing"

---

## API Endpoints Reference

All API endpoints that mobile app needs to call:

### Authentication
- `POST login.php` - Vendor login
- `POST signup.php` - Vendor registration
- `POST logout.php` - Logout

### Dashboard & Analytics
- `GET vendor-dashboard.php?format=json` - Dashboard data

### Listings
- `GET vendor-listings-data.php?format=json&page=1&per_page=20&status=all&search=&sort=recent` - List listings
- `POST vendor-listing-update.php` - Create/update listing
- `POST vendor-listing-sync.php?listingId={id}` - Sync to Firestore
- `POST vendor-listing-delete.php` - Delete listing

### Profile
- `POST update-vendor-profile.php` - Update profile

### Settings
- `POST update-vendor-settings.php` - Update settings

### Notifications
- `GET vendor-notifications-data.php?format=json` - Get notifications

### Billing
- `GET vendor-billing-history.php?format=json` - Get billing history

### Plans & Subscriptions
- `GET vendor-plans.php?format=json` - Get available plans
- `GET vendor-subscriptions.php?format=json` - Get current subscription
- `POST vendor-subscription-action.php` - Subscription actions (renew, cancel, upgrade)
- `POST vendor-renew-plan.php` - Renew plan

### Verification
- `GET vendor-verification-status.php?format=json` - Get verification status
- `POST verify.php` - Submit verification

### Storefront
- `GET vendor-storefront-data.php?vendor_id={id}&format=json` - Get storefront data

### Account
- `POST vendor-delete-account.php` - Delete account

### Chats (Firebase Firestore + API)
- `GET api/chat/list-chats.php` - Get chat list
- `GET api/chat/list-messages.php?chatId={id}` - Get messages
- `POST api/chat/send-message.php` - Send message
- `POST api/chat/mark-read.php` - Mark messages as read
- Firebase Firestore: Real-time subscriptions

### Support
- `POST send-email.php` - Contact support

### Cloudinary
- `POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` - Upload images

---

**Last Updated**: 2025-11-05  
**Mobile App Version**: 1.0.0  
**React Native Version**: 0.81.5  
**Expo SDK**: 54.0.22

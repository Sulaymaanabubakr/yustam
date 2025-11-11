# Yustam Backend (Node + Express + PostgreSQL)

One consolidated API for **Yustam Mobile (React Native)**, the HTML/JS **admin dashboard**, and every vendor workflow that previously depended on PHP endpoints. The service is written in TypeScript, persists data in PostgreSQL via Prisma, authenticates with Firebase, and stores media on Cloudinary.

## Highlights
- Full replacement for `*.php` endpoints (auth, listings, chat, vendor tooling, admin analytics).
- Modular Express routers: `/auth`, `/home`, `/categories`, `/products`, `/favorites`, `/notifications`, `/plans`, `/vendor`, `/verification`, `/support`, `/chats`, `/admin`.
- PostgreSQL schema covers buyers, vendors, plans, billing transactions, verification requests, saved items, notifications, support tickets, chat metadata, etc.
- Cloudinary upload streams for product images + vendor documents, Firebase Admin SDK for auth + chat thread bootstrapping.
- Works as a long-running Node server (`npm start`) or as a Vercel serverless function (`api/index.ts`).

---
## Project Layout
```
yustam-backend/
├── api/index.ts                # Optional Vercel serverless entry
├── prisma/
│   ├── schema.prisma           # Database schema (users, vendors, plans...)
│   └── seed.ts                 # Demo data (admin, vendor, products, notifications, tickets)
├── src/
│   ├── app.ts / server.ts      # Express bootstrap & entrypoint
│   ├── config/                 # env, firebase, cloudinary helpers
│   ├── middleware/             # auth, uploads, error handling
│   ├── routes/                 # REST routers grouped by feature
│   ├── services/               # Business logic per domain
│   ├── utils/                  # Cloudinary + JWT helpers
│   └── types/express.d.ts      # Extends Express Request with auth payload
├── .env.example                # Required environment variables
├── eslint.config.mjs / tsconfig.json
└── README.md                   # You are here
```

---
## Environment Variables
Copy `.env.example` → `.env` and fill in production secrets.

| Key | Description |
| --- | --- |
| `PORT` | Local dev port (default `4000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Used to mint short-lived app tokens after Firebase login |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_STORAGE_BUCKET` | Firebase Admin SDK creds |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_DISPLAY_NAME` | Seed helpers |

> Never commit a populated `.env`.

---
## Setup & Scripts
```bash
npm install                      # install deps
npx prisma generate              # sync Prisma client
npx prisma migrate dev --name init   # create migrations (or migrate deploy in CI)
npm run seed                     # optional demo content
npm run dev                      # start Express with ts-node-dev
npm run lint                     # ESLint (flat config)
npm run build && npm start       # compile to dist/ + run with node
```

Express listens on `/api` (`/health` for probes).

---
## Firebase + Mobile SDK Notes
- Backend verifies Firebase ID tokens on every request (send `Authorization: Bearer <idToken>` from both the mobile app and admin panel).
- `yustam-mobile/android/app/google-services.json` and `yustam-mobile/ios/GoogleService-Info.plist` are already in place.
- **Android**: add the Google Services Gradle plugin in the root and app modules plus `firebase-bom:34.5.0` deps.
- **iOS**: add `https://github.com/firebase/firebase-ios-sdk` via Swift Package Manager and call `FirebaseApp.configure()` from `AppDelegate` (sample SwiftUI snippet included in `.env.example`).

---
## REST Surface (mapped to app screens & admin modules)
| Frontend Area | Purpose | Endpoints |
| --- | --- | --- |
| Splash / Session | Exchange Firebase token for backend session | `POST /api/auth/session`, `GET/PATCH /api/auth/me` |
| Onboarding roles | Activate vendor mode, fetch profile | `POST /api/vendor/activate`, `GET /api/vendor/me` |
| Home hero, flash sale, categories | Populate `HomeScreen` + `SearchScreen` defaults | `GET /api/home`, `GET /api/categories` |
| Product catalogue & search filters | List, detail, CRUD with Cloudinary uploads | `GET /api/products` (supports search/category/state/price/pagination), `GET /api/products/:id`, `POST/PATCH/DELETE /api/products` (admin + vendors) |
| Saved Items / Wishlist | Buyer favorites toggle | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:productId` |
| (Removed) | Cart + checkout flows were intentionally removed per latest requirements | — |
| Orders | (Removed) Marketplace is catalogue-only per latest requirements | - |
| Notifications | Mobile & admin notification center (mark read, broadcast) | `GET /api/notifications`, `POST /api/notifications/read`, `/read-all`, `POST /api/notifications` (admin broadcast) |
| Chat | Thread bootstrap + metadata for Firebase messages | `GET/POST /api/chats`, `/api/chats/:threadId/messages`, `/assign` |
| Profile Settings | Update profile, preferences | `PATCH /api/auth/me`, `GET/POST /api/support` |
| Vendor Dashboard | Stats, analytics, storefront, plan usage | `GET /api/vendor/me/dashboard`, `/analytics`, `/storefront/:slug` |
| Vendor Listings | Same `/api/products` endpoints scoped to owner |
| Plans & Billing | Show plans, subscribe, view history | `GET /api/plans`, `GET /api/plans/subscriptions/me`, `POST /api/plans/:planId/subscribe` |
| Billing history (vendor) | Provided via subscriptions + `/api/vendor/me/dashboard` plan block |
| Verification center | Submit docs, check status, admin reviews | `GET/POST /api/verification`, `GET /api/verification/requests`, `PATCH /api/verification/requests/:id` |
| Support center | FAQ/Help screen + admin replies | `GET/POST /api/support`, `GET/POST /api/support/:ticketId/messages`, `GET /api/support?all=true` (admin) |
| Admin dashboard | Manage listings, users, vendors, plans, tickets | `/api/admin/dashboard`, `/products`, `/users`, `/vendors`, `/verifications`, `/support/tickets`, `/plans` |

All sensitive data is guarded by `authenticate` + `requireRole` middleware which understands `Role.BUYER`, `Role.VENDOR`, and `Role.ADMIN`.

---
## Database Model (Prisma)
- **Users**: Firebase UID, role, profile metadata, relationships to chats.
- **VendorProfile**: storefront slug, verification status, current plan, analytics counters.
- **Plans & Billing**: plan catalog, subscriptions, billing transactions, listing usage.
- **Products**: condition, category, location fields, flags for featured/flash sale, Cloudinary media.
- **SavedItem**, **CartItem**, **Order/OrderItem**.
- **Notifications**, **SupportTicket/SupportMessage**, **VerificationRequest/Document**, **ChatThread/Message**.

`prisma/seed.ts` now provisions:
- Admin + buyer + vendor accounts
- 12 marketplace categories
- 3 subscription plans (Starter, Growth, Scale)
- Vendor profile + active subscription + billing transaction
- Featured + flash-sale products (admin + vendor owned)
- Saved item, notifications, support ticket, verification record

Run `npm run seed` after configuring `.env` to explore the data via Prisma Studio or the mobile app.

---
## Cloudinary + Uploads
- Product images: `POST /api/products` or `PATCH /api/products/:id` send `multipart/form-data` with up to 6 `media` files. Streams land in `yustam/products`.
- Vendor verification docs: `POST /api/verification` accepts `documents` + optional `documentTypes` and stores in `yustam/vendor-verifications`.
- If the mobile app uploads to Cloudinary directly, just send `{ url, publicId }` in the payload.

---
## Deployment Notes
### Traditional Node/PM2/Fly/Render
1. Build the project: `npm run build`.
2. Provision PostgreSQL, set env vars (`DATABASE_URL`, Firebase, Cloudinary, JWT secret, etc.).
3. Run migrations: `npx prisma migrate deploy`.
4. Optionally seed: `npm run seed`.
5. Start process manager: `node dist/server.js` (or pm2, docker, etc.).

### Vercel Serverless
1. `vercel link` then `vercel deploy`.
2. Vercel builds `api/index.ts` which mounts the Express app.
3. Configure the same env vars in the Vercel dashboard.
4. Use Vercel Postgres/Neon/Supabase and run `prisma migrate deploy` + `npm run seed` via build hook or a one-off job.

---
## Replacing PHP Calls
Every previous PHP endpoint mentioned in `VENDOR_ROUTES_MAP.md`, `admin-*.php`, or the legacy mobile docs has a one-to-one replacement:
- `vendor-dashboard.php` → `GET /api/vendor/me/dashboard`
- `vendor-listings-data.php` → `GET /api/products?ownerId=<vendorId>&includeDrafts=true`
- `vendor-listing-editor.php` → `POST/PATCH /api/products`
- `vendor-billing-history.php` → `GET /api/plans/subscriptions/me`
- `vendor-notifications-data.php` → `GET /api/notifications`
- `vendor-support.php` → `/api/support`
- `vendor-storefront.php` → `GET /api/vendor/storefront/:slug`
- `vendor-plans.php` → `/api/plans`
- `vendor-verification.php` → `/api/verification`
- `admin-vendors.php` → `/api/admin/vendors`
- `admin-verifications.php` → `/api/admin/verifications` (and `/api/verification/requests` for actions)
- `admin-listings.php` → `/api/admin/products`
- Chat PHP endpoints → `/api/chats/*`

Wire the React Native app and admin panel’s API client to these Express routes, sending Firebase tokens just like the mobile code already expects.

---
## Troubleshooting Checklist
- 401s → make sure the Firebase ID token is fresh (`user.getIdToken(true)`), and `Authorization` header is present.
- 403s on vendor routes → call `POST /api/vendor/activate` once to mint a `VendorProfile` + elevate the role.
- 500s on uploads → verify Cloudinary creds + ensure `multer` memory limit (5 MB) fits your assets.
- Prisma errors → run `npx prisma migrate dev` and confirm `DATABASE_URL` points to a reachable Postgres instance.
- Chat thread mismatches → ensure Firebase Firestore has matching `threads` docs created via `/api/chats`.

---
## Next Steps
1. Point the React Native `apiClient` base URL to this backend and wire the axios/fetch calls already scaffolded in `src/services/api.js`.
2. Update the admin dashboard JS to hit `/api/*` instead of `*.php`.
3. Configure real Firebase + Cloudinary credentials and disable legacy PHP hosting once smoke tests pass.
4. Add any custom Prisma migrations needed for production data, then deploy.

With this backend running, the PHP scripts can be fully retired-the Node/Express service is now the single source of truth for authentication, catalog management, vendor tooling, admin analytics, real-time chat metadata, and notifications.

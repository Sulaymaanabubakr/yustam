# YustaAI Personal Shopper

## Overview

This document covers the backend endpoint and mobile integration entry points for the YustaAI Personal Shopper experience.

- **Backend endpoint:** `POST /api/bot/query`
- **Mobile entry point:** `yustam-mobile/src/screens/shared/BotScreen.js`
- **Navigation:** `yustam-mobile/src/navigation/MainTabNavigator.js`

## Environment Variables

Add the following to `.env` on the web backend host:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
BOT_RATE_LIMIT=8
BOT_RATE_LIMIT_WINDOW=60
BOT_CACHE_TTL=300
BOT_WISHLIST_ENABLED=1
BOT_VENDOR_REWARDS_ENABLED=1
BOT_WISHLIST_NOTIFICATIONS=1
BOT_VENDOR_NOTIFICATIONS=1
```

- `OPENAI_API_KEY` is required for live OpenAI calls.
- `OPENAI_MODEL` is optional and falls back to `gpt-4o-mini`.
- `BOT_RATE_LIMIT` controls per-user requests within the window (`BOT_RATE_LIMIT_WINDOW` seconds).
- `BOT_CACHE_TTL` caches successful AI interpretations to reduce repeat OpenAI calls.
- `BOT_WISHLIST_ENABLED` / `BOT_VENDOR_REWARDS_ENABLED` toggle downstream integrations without redeploying the app.
- `BOT_WISHLIST_NOTIFICATIONS` / `BOT_VENDOR_NOTIFICATIONS` enable automated alert delivery when integration payloads change.

## Integration Endpoints

| Route | Method | Description |
| --- | --- | --- |
| `/api/bot/status` | `GET` | Returns OpenAI readiness, model name, and per-integration readiness/meta scoped to the authenticated user. |
| `/api/bot/integrations/wishlist` | `POST` | Syncs the latest buyer-facing YustaAI insight bundle, stores a snapshot, and (optionally) emits a wishlist notification. |
| `/api/bot/integrations/vendor-rewards` | `POST` | Syncs the latest vendor reward summary, persists it for dashboards, and (optionally) creates a vendor notification. |

The sync payload mirrors what `useBotQuery` forwards (`entryId`, `query`, `summary`, `followUps`, `intent`, `listings`, `mode`, `location`, `model`, `timestamp`). When the snapshot changes, notifications are emitted automatically subject to the feature flags above.

## Request Contract

**Endpoint:** `POST /api/bot/query`

**Headers:**

- `Authorization: Bearer <JWT>`
- `Content-Type: application/json`

**Body:**

```json
{
  "query": "Show me iPhones under ₦200k nearby",
  "mode": "local",
  "location": {
    "state": "Lagos",
    "city": "Ikeja"
  }
}
```

`mode` accepts `local` or `global`. Location is optional and is auto-resolved from the logged-in vendor profile when possible.

## Response Shape

```json
{
  "success": true,
  "query": {
    "text": "Show me iPhones under ₦200k nearby",
    "mode": "local",
    "location": {
      "state": "Lagos",
      "city": "Ikeja"
    }
  },
  "ai": {
    "configured": true,
    "model": "gpt-4o-mini",
    "intent": "Find affordable iPhones",
    "filters": {
      "keywords": ["iphone", "apple"],
      "minPrice": null,
      "maxPrice": 200000,
      "state": "Lagos",
      "city": "Ikeja"
    },
    "summary": [
      "Highlighting iPhone deals near Ikeja",
      "Tap a listing to chat with the vendor"
    ],
    "followUps": [
      "Any preferred storage size?"
    ],
    "cached": false
  },
  "listings": {
    "items": [
      {
        "id": 123,
        "title": "iPhone 12"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  },
  "fallbackUsed": false,
  "timestamp": 1732147200
}
```

When OpenAI is unavailable or rate limiting blocks the request, the response falls back to a keyword search using the provided query and includes `fallbackUsed: true`.

## Rate Limiting & Caching

- Rate limiting is enforced per authenticated user (`BOT_RATE_LIMIT` within `BOT_RATE_LIMIT_WINDOW`). Exceeding the quota returns HTTP 429 with `retryAfter` seconds in the payload.
- Successful AI interpretations are cached for `BOT_CACHE_TTL` seconds. During the cache window we bypass OpenAI and reuse the last filter suggestion while still fetching live listings.

## Frontend Integration Notes

1. **API Client:** `yustam-mobile/src/services/api.js` exposes `botAPI.query`, `botAPI.status`, and the integration helpers `botAPI.syncWishlist` and `botAPI.syncVendorRewards` (wrapping `/bot/query`, `/bot/status`, and the `/bot/integrations/*` routes).
2. **Hook:** `src/hooks/useBotQuery.js` manages history, persistence, rate-limit feedback, and now surfaces `latestResponse`, `integrations`, and `syncIntegrations` alongside the existing `sendQuery`, `setMode`, `updateLocation`, and `clearHistory` helpers.
3. **Screen:** `src/screens/shared/BotScreen.js` renders the full YustaAI conversation UI, including summaries, listings, follow-up prompts, and mode toggles.
4. **Error States:** The hook surfaces rate-limit responses (429) and falls back to marketplace search when OpenAI is offline; UI messaging highlights these cases.
5. **Mode Toggle:** Local vs global marketplace behaviour is controlled via the hook and UI toggle, with optional state/city filters persisted in AsyncStorage.
6. **Downstream Integrations:** Once `/bot/status` reports wishlist or vendor reward integrations as ready (or an override enables them), the hook pushes the latest YustaAI summary to those services automatically and keeps retry utilities available via `syncIntegrations`.

## Testing Checklist

- Authenticated buyers and vendors can hit `/api/bot/query`.
- Missing or blank queries return HTTP 422 with a helpful message.
- Requests beyond the rate limit return HTTP 429 and respect `retryAfter`.
- When `OPENAI_API_KEY` is unset, the endpoint still returns listings via fallback search and sets `fallbackUsed: true`.
- Cached requests reuse AI filters but refresh listings every call.

## Next Steps

- Confirm `/bot/integrations/wishlist` and `/bot/integrations/vendor-rewards` endpoints surface readiness flags via `/bot/status` once deployed.
- Feed vendor points metadata into `response.ai.summary` from the rewards service when available.
- Log AI interactions for analytics/auditing once the data warehouse events pipeline is ready.

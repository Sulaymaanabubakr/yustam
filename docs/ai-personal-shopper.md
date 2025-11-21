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
```

- `OPENAI_API_KEY` is required for live OpenAI calls.
- `OPENAI_MODEL` is optional and falls back to `gpt-4o-mini`.
- `BOT_RATE_LIMIT` controls per-user requests within the window (`BOT_RATE_LIMIT_WINDOW` seconds).
- `BOT_CACHE_TTL` caches successful AI interpretations to reduce repeat OpenAI calls.

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

1. **API Client:** Extend `yustam-mobile/src/services/api.js` with `botAPI.query(payload)` that posts to `/bot/query`.
2. **Hook:** Build a dedicated hook under `src/hooks/useBotQuery.ts` (or .js) to wrap React Query or simple state management.
3. **Screen:** Replace the placeholder in `BotScreen.js` with a conversational UI that calls `botAPI.query` and renders `response.ai.summary`, `listings.items`, and `response.ai.followUps` suggestions.
4. **Error States:** Display friendly messaging when `fallbackUsed` is `true` and highlight the retry wait when HTTP 429 is returned.
5. **Mode Toggle:** Use existing filter panels (see `BuyerSearchScreen` components) to allow users to toggle between `local` and `global` before invoking the bot.

## Testing Checklist

- Authenticated buyers and vendors can hit `/api/bot/query`.
- Missing or blank queries return HTTP 422 with a helpful message.
- Requests beyond the rate limit return HTTP 429 and respect `retryAfter`.
- When `OPENAI_API_KEY` is unset, the endpoint still returns listings via fallback search and sets `fallbackUsed: true`.
- Cached requests reuse AI filters but refresh listings every call.

## Next Steps

- Wire wishlist alert summaries once the notification service is ready.
- Feed vendor points metadata into `response.ai.summary` from the rewards service when available.
- Log AI interactions for analytics/auditing once the data warehouse events pipeline is ready.

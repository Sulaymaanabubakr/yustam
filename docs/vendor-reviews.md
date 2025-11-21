# Vendor Reviews API

The vendor reviews endpoints allow buyers to rate their experience, and expose summary data for vendor dashboards and storefronts.

## Endpoints

### `POST /api/reviews`
Create or update a review for a vendor (buyers) or leave an admin-authored note.

Request body fields:
- `vendorId` *(required)* — numeric vendor identifier.
- `listingId` *(optional)* — numeric listing ID to attach the review to.
- `listingPublicId` *(optional)* — listing public or Firestore ID (auto-resolves to numeric ID when provided).
- `rating` *(required)* — integer 1-5.
- `comment` *(optional)* — free-form text.
- `status` *(admin only, optional)* — one of `published`, `pending`, `hidden`, `flagged`.
- `reviewerRef` *(optional)* — overrides the reviewer reference (defaults to the authenticated user).

Response payload:
```json
{
  "success": true,
  "review": { /* normalised review record */ },
  "summary": { /* vendor rating stats */ },
  "created": true
}
```

The endpoint idempotently updates an existing review when the same reviewer submits feedback for the same vendor/listing pair. Vendors receive an in-app notification when a new review is created.

### `GET /api/reviews`
List reviews for a vendor. Authenticated vendors automatically scope to their own account; admins can supply `?vendorId=<id>`.

Supported query params:
- `vendorId` *(required for public requests)*.
- `listingId` or `listingPublicId` *(optional filters)*.
- `status` *(optional, defaults to `published` for unauthenticated users)*.
- `page`, `pageSize` *(pagination, default 1/20; max pageSize 100)*.

Response payload:
```json
{
  "success": true,
  "data": {
    "vendorId": 42,
    "filters": { ... },
    "reviews": [ /* normalised review records */ ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### `GET /api/reviews/summary`
Returns aggregate review stats and a recent feed for dashboards or storefronts.

Query params:
- `vendorId` *(required unless the caller is an authenticated vendor)*.
- `limit` *(optional, default 5, max 20)*.

Response payload:
```json
{
  "success": true,
  "data": {
    "vendorId": 42,
    "stats": {
      "averageRating": 4.6,
      "totalReviews": 18,
      "distribution": { "1": 0, "2": 1, "3": 2, "4": 5, "5": 10 }
    },
    "recent": [ /* latest published reviews */ ]
  }
}
```

### `GET /api/reviews/{id}`
Fetch a single review. Unauthenticated callers only receive `published` reviews. Vendors can access their own reviews regardless of status; admins can access all reviews.

Response payload:
```json
{
  "success": true,
  "review": { /* normalised review record */ }
}
```

### `PATCH /api/reviews/{id}`
Update the moderation status for a review. Vendor-authenticated callers may toggle between `published` and `hidden`. Admins can set any valid status.

Request body:
- `status` *(required)* — `published`, `pending`, `hidden`, or `flagged` (vendors: `published`/`hidden` only).

Response payload mirrors the create endpoint, returning the updated review and refreshed vendor summary.

### `DELETE /api/reviews/{id}`
Remove a review (admin only). Returns a confirmation message plus the vendor's updated summary block.

## Review Record Shape

Every review item follows this structure:

```json
{
  "id": 123,
  "vendorId": 42,
  "listingId": 17,
  "listingPublicId": "abc123",
  "rating": 5,
  "comment": "Amazing service!",
  "status": "published",
  "reviewer": {
    "ref": "buyer:99",
    "name": "Ada"
  },
  "createdAt": "2025-11-20T18:00:00Z",
  "updatedAt": "2025-11-20T18:00:00Z"
}
```

## Notifications

When a review is created by a buyer, the system pushes a vendor notification titled "New review received" containing the rating, comment, and listing metadata.

## Database Notes

Reviews are stored in the `vendor_reviews` table. The schema is auto-created at runtime (see `yustam_reviews_ensure_table`). Aggregation helpers:
- `yustam_reviews_vendor_stats($vendorId)`
- `yustam_reviews_vendor_recent($vendorId, $limit)`
- `yustam_reviews_list($filters, $page, $pageSize)`

These helpers power both the public summary endpoint and the vendor dashboard feed.

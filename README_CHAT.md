# YUSTAM Chat System

This document summarises the messaging stack that powers the rebuilt WhatsApp-style conversations between buyers and vendors.

## Firestore Collections

- `chats/{chatId}` — summary document for each vendor/buyer conversation.
- `chats/{chatId}/messages/{messageId}` — ordered message history.
- `typing/{chatId}` — lightweight presence document for typing indicators.

### Required Composite Indexes

Create the following indexes in the Firebase console (Firestore Database → Indexes):

1. **Collection** `chats` — Fields:
   - `buyer_uid` Ascending
   - `last_ts` Descending

2. **Collection** `chats` — Fields:
   - `vendor_uid` Ascending
   - `last_ts` Descending

If either query fails because an index is missing the client will surface a toast with the Firebase console link so you can create it immediately.

### Security Rules

```
match /databases/{database}/documents {
  match /chats/{chatId} {
    allow read, update: if isParticipant(chatId);
    allow create: if request.auth != null && isParticipant(chatId);
  }

  match /chats/{chatId}/messages/{messageId} {
    allow read: if isParticipant(chatId);
    allow create: if request.auth != null && isParticipant(chatId);
    allow update, delete: if false; // append-only
  }

  match /typing/{chatId} {
    allow read, write: if isParticipant(chatId);
  }
}

function isParticipant(chatId) {
  return request.auth != null &&
    (resource.data.buyer_uid == request.auth.token.uid ||
     resource.data.vendor_uid == request.auth.token.uid ||
     request.resource.data.buyer_uid == request.auth.token.uid ||
     request.resource.data.vendor_uid == request.auth.token.uid);
}
```

Adjust the `isParticipant` helper to match your auth strategy (custom claims vs UID mapping). The PHP fallbacks use service-account authentication so they must also comply with these rules.

## Cloudinary Configuration

- **Cloud name:** `dpc16a0vd`
- **Unsigned preset:** `yustam_unsigned`
- **Upload URL:** `https://api.cloudinary.com/v1_1/dpc16a0vd/upload`

Image attachments and voice notes are uploaded through the shared `cloudinary.js` helper before the Firestore write. Assets are stored in:

- Images: `yustam/chats/images`
- Voice notes: `yustam/chats/voice`

Ensure both the cloud name and unsigned preset remain valid for unsigned uploads.

## Voice Recording

- Voice capture uses the browser `MediaRecorder` API with `audio/webm` blobs.
- Hold the mic button to start recording, slide left to cancel, release to send.
- Uploads are converted to `voice-<timestamp>.webm` files in Cloudinary, and the secure URL is stored in Firestore alongside the duration.
- Playback uses the native `<audio>` element with a lightweight waveform progress indicator.

### Browser Support

- MediaRecorder requires HTTPS (or localhost) and user consent.
- If `navigator.mediaDevices.getUserMedia` is unavailable the UI surfaces a toast and keeps the message queue intact.

## Offline Behaviour

- Outgoing messages queue in `localStorage` (`yustam-offline-messages`).
- When connectivity resumes queued messages are replayed automatically; users see a toast confirming the resend.
- Read receipts and typing flags are suppressed while offline to avoid errors.

## Known Issues / Follow-Ups

- Firestore REST fallbacks require a valid service-account JSON (`FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS`). If this is missing the PHP endpoints will respond with a 500.
- The waveform visualiser for voice notes is minimal and relies on playback progress; consider upgrading to a richer visual library if desired.
- Phone/video call buttons in the header currently display a toast — replace with actual calling integration when available.
- Admin-created chats (without going through the product page) must still pass through `chat-open.php` or the client `ensureChat` helper to guarantee the summary document exists.


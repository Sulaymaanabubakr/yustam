# PHP Chat Rebuild Plan (Framework-Free)

## Mission
Rebuild the buyer↔vendor chat stack within the existing PHP + Firestore environment, but with a clean modular architecture that supports text, image, video, and voice messages. Target outcomes: high reliability, predictable data flow, and maintainable code without introducing a new framework.

## Guiding Principles
- **Service boundaries**: Isolate chat logic from `api/index.php` into dedicated modules/classes under `chat/`.
- **Consistent contracts**: Define clear request/response DTOs and validation routines for every endpoint.
- **Observability first**: Structured logging, metrics hooks, and verbose error context.
- **Extensible media pipeline**: Support file uploads (image/video) and voice messages with sanitisation, storage, and metadata.
- **Backwards-compatible rollout**: Maintain legacy endpoints while introducing new versions via versioned routes.

## High-Level Architecture
```
chat/
├─ bootstrap.php          # Initializes config, autoloading, error handling
├─ Router.php             # Lightweight router for chat endpoints
├─ Http/
│   ├─ Controllers/       # ThreadController, MessageController, MediaController
│   ├─ Requests/          # Validation classes per endpoint
│   └─ Responses/
├─ Domain/
│   ├─ Models/            # Thread, Participant, Message, Attachment (plain PHP objects)
│   ├─ Services/          # MessageService, ThreadService, MediaService, SyncService
│   └─ Repositories/      # FirestoreThreadRepository, MysqlMetadataRepository
├─ Infrastructure/
│   ├─ Firestore/
│   ├─ Database/
│   ├─ Storage/           # Cloudinary/S3 adapters
│   └─ Logging/
├─ Support/
│   ├─ Validators.php
│   ├─ IdGenerator.php
│   └─ Clock.php
└─ public/
    └─ index.php          # New entry point (optional)
```

## API Surface (v2)
| Method | Path | Description |
| --- | --- | --- |
| POST | /api/chat/v2/threads | Create/open thread (idempotent) |
| GET | /api/chat/v2/threads | List threads for current user |
| GET | /api/chat/v2/threads/{id} | Thread detail + last messages |
| POST | /api/chat/v2/threads/{id}/messages | Send text/image/video/voice |
| GET | /api/chat/v2/threads/{id}/messages | Paginated history |
| POST | /api/chat/v2/threads/{id}/read | Mark read up to timestamp |
| POST | /api/chat/v2/threads/{id}/typing | Typing indicator (optional) |
| POST | /api/chat/v2/media/upload-url | Issue signed upload target |
| POST | /api/chat/v2/media/complete | Finalise upload & attach to message |

## Data Model (Firestore + MySQL)
- **Firestore `chats/{threadId}`**
  - `buyer_uid`, `vendor_uid`, `listing_ref`, `last_message`, `last_sender_role`, `last_ts`, counters.
- **Firestore `chats/{threadId}/messages/{messageId}`**
  - `type` (text/image/video/voice), `text`, `media_url`, `media_meta`, `voice_duration`, `sender_uid`, `sender_role`, `ts`, `client_tag`, `read_by` map.
- **MySQL `api_chat_threads`** (cache/metadata)
  - `chat_id`, `buyer_ref`, `vendor_ref`, `buyer_uid`, `vendor_uid`, `metadata` JSON (listing info, media hints), timestamps.

## Migration Strategy
1. **Scaffold modules**: Create new chat core under `chat/`, implement autoloader via Composer (vendor/bin not required to run in production once installed locally).
2. **Implement v2 endpoints**: Route calls within `api/index.php` to new controllers while keeping v1 endpoints intact.
3. **Backfill metadata**: Re-run Firestore↔MySQL synchronisation scripts to populate new fields (`media_meta`, `voice_duration`).
4. **Media pipeline**:
   - Use current Cloudinary integration for image/video.
   - Store voice messages as audio files (MP3/OGG) with metadata in Firestore.
   - Add PHP upload handlers with validation (size, mime, rate limiting).
5. **Client updates**: Update `buyer-chats.js`, `vendor-chats.js`, and React Native `chatSync.js` to call v2 endpoints, handle new message types, and display media.
6. **Observability**: Introduce structured logging helper, log contexts, and optionally integrate with an external log aggregator.
7. **Cutover**: After testing, set v2 as default; keep v1 as fallback during burn-in.

## Immediate Tasks
1. Set up Composer autoloader for `chat/` namespace (local composer install suffices once).
2. Create `chat/bootstrap.php` with config, error handling, and autoload registration.
3. Implement lightweight router and base controller/response classes.
4. Port existing chat context logic into `ThreadService` and `MessageService` with unit tests.
5. Build new v2 endpoints for thread list/send message with improved validation & logging.
6. Update Firestore repository to normalise responses regardless of `document`/`found` payload.
7. Implement media upload endpoints (scaffolding) and integrate with existing Cloudinary helper.
8. Provide client-side mocks or API contracts for frontend teams to adjust.

## Testing Strategy
- **Unit tests**: for services (message creation, metadata merge, validation).
- **Integration tests**: run PHP scripts to hit Firestore emulator or stubbed responses.
- **End-to-end**: use Postman/Newman collection to verify API behaviour before client rollout.
- **Load validation**: script to send bursts of messages and ensure Firestore/MySQL remain consistent.

## Tooling
- Continue using `phpunit` (add composer dev deps locally) for new modules.
- Add static analysis (Psalm/Phan) once autoloading is in place.
- Use existing deployment process (FTP/Git) after building artifacts locally.

## Rollout Checklist
- [ ] Composer autoloader committed (`vendor/` ignored; `composer.json` committed).
- [ ] New modules deployed to staging; regression tests pass.
- [ ] Frontend clients updated to support new message types.
- [ ] Monitoring in place for Firestore errors, media upload failures, message drop rates.
- [ ] Production deployment with rollback plan (switch v1 endpoints back if needed).

# Chat Platform Rebuild Plan

## 1. Goals
- Deliver a reliable, scalable chat experience for buyers, vendors, admins, and support agents.
- Provide rich communication features out of the box: text, image, video, voice notes, and typing/read indicators.
- Unify real-time messaging, persistence, notifications, and background sync across web and mobile clients.
- Improve observability (logs, metrics, alerts) and admin tooling for support and compliance.
- Ensure backwards-compatible migration with minimal downtime and clear rollback options.

## 2. Functional Scope
- **User roles**: buyers, vendors, admins, support specialists, system automations.
- **Conversation model**: one-to-one threads (buyer↔vendor, vendor↔support), extensible to group or broadcast in later phases.
- **Message types**: text, image, video, voice note/audio clip, system events (status updates, automation prompts).
- **Core UX**: thread inbox, real-time message stream, read receipts, typing indicators, attachment previews, delivery state (sending/sent/read), retry queue when offline.
- **Media handling**: upload, transcode, and store images/videos; optional thumbnail generation; voice messages with duration metadata; storage quotas and expiry rules.
- **Notifications**: push/web/email notifications, granular opt-in preferences, quiet hours.
- **Admin tooling**: conversation search, message auditing, attachment moderation, escalation workflow.
- **Future-ready**: full-text search, retention policies, analytics hooks, chatbot handoff, multilingual support.

## 3. Architecture Overview
- **Service layer**: Dedicated chat service (target stack: Laravel 11 + PHP 8.3 *or* Node.js/TypeScript + NestJS) exposing REST + WebSocket endpoints. Service encapsulates authentication proxy, permission checks, and media workflow.
- **Real-time transport**: WebSockets (Socket.IO or Laravel Websockets) with fallbacks (SSE/long polling). Event bus (e.g., Redis pub/sub) coordinates multiple instances.
- **Data store**: Primary relational DB (PostgreSQL preferred for JSON/indexing) storing threads, participants, messages, attachments, voice metadata, delivery receipts. Redis for ephemeral presence/typing state and rate limiting.
- **Media pipeline**: Cloudinary/S3 bucket for original uploads, optional transcoding via Cloudinary transformations or AWS Elastic Transcoder; CDN delivery; signed URLs for secure access.
- **Search & analytics**: ElasticSearch/Meilisearch for full-text chat search (phase 2); event streaming to analytics platform.
- **Clients**: Web buyer/vendor portals, admin SPA, React Native app integrating through a shared chat SDK (TypeScript + Swift/Kotlin wrappers as needed).
- **Observability**: Centralized logging (Monolog to CloudWatch/ELK), metrics via Prometheus/Grafana, tracing via OpenTelemetry (phase 2).

## 4. Workstreams & Milestones
1. **Discovery & Requirements (Week 1)**
   - Audit current schema, Firestore documents, attachment storage, and client entry points.
   - Document media requirements (max file size, formats, transcoding, retention) and compliance needs.
   - Produce detailed ERD draft and OpenAPI spec skeleton for new service.

2. **Platform Foundations (Week 2-3)**
   - Finalize tech stack decision, scaffold service project with CI/CD, environment configs, base testing setup.
   - Design and migrate initial database schema (threads, participants, messages, attachments, voice metadata, delivery receipts, reactions if needed).
   - Implement authentication middleware (JWT/session handoff), role-based access control, rate limiting, audit logging.
   - Build REST endpoints for thread listing, creation, joining, message send/list, media upload init, read receipts, typing state.
   - Stand up WebSocket infrastructure and connect to message pipeline.

3. **Media Pipeline & Storage (Week 3-4)**
   - Implement upload endpoints (pre-signed URLs or direct Cloudinary uploads) for images, videos, voice notes.
   - Integrate background processing for thumbnails, transcoding, waveform extraction (voice), size validation, virus scanning (optional).
   - Update CDN configuration and signed URL strategy for protected access.

4. **Client SDK & Integrations (Week 4-5)**
   - Build shared chat SDK (TypeScript, with adapters for PHP backend and React Native).
   - Update buyer/vendor web portals to use SDK with feature flags; incorporate media capture/upload UI.
   - Update React Native chat screens for new API, real-time updates, offline persistence, voice recorder, gallery picker.
   - Revise admin console with conversation search, media preview, moderation tools.

5. **Migration & Backfill (Week 5-6)**
   - Design migration scripts to port legacy MySQL + Firestore chat data (metadata, messages, attachments) into new schema.
   - Implement idempotent backfill with validation reports and rollback safety.
   - Run staging migration rehearsal; performance-test new service under expected load.

6. **Rollout & Monitoring (Week 7)**
   - Deploy service and clients behind toggles; configure observability dashboards and alerts.
   - Perform phased rollout (internal users → beta cohort → full audience) with live monitoring.
   - Maintain read-only legacy endpoints during transition for fallback.

7. **Post-launch Hardening & Enhancements (Week 8+)**
   - Review telemetry, close high-priority bugs, adjust resource scaling.
   - Deliver search, analytics hooks, chatbot integration plan, automated moderation tooling.
   - Document operational playbooks and handoff to support/DevOps.

## 5. Immediate Next Steps
1. Finalize service framework (Laravel vs NestJS) and hosting topology.
2. Draft OpenAPI specification covering threads, messages, media upload lifecycle, voice note metadata, real-time event schema.
3. Produce ERD and migration plan for new relational schema, including attachment/voice tables.
4. Define media storage strategy (Cloudinary transformations, S3 buckets, CDN) and budgets.
5. Scaffold service repo with CI pipeline, environment configs, local dev scripts.
6. Align stakeholders (product, mobile, support) on MVP feature checklist and rollout plan.

## 6. Risks & Mitigations
- **Scope creep**: lock MVP to agreed feature set; triage enhancements into post-launch backlog.
- **Media cost overruns**: enforce upload size limits, use adaptive bitrate/transcoding, monitor bandwidth usage.
- **Migration failures**: implement dry-run scripts with row-level validation, backups, and reversible transformations.
- **Client regression**: rely on feature flags, automated integration tests, dedicated QA passes on each platform.
- **Realtime reliability**: provision scalable WebSocket infrastructure, implement reconnection/backoff strategies, monitor message queue health.
- **Security/compliance**: apply attachment scanning, signed URLs, RBAC, audit logs.

## 7. Success Metrics
- <1% error rate on send/list operations.
- P95 message delivery latency < 1.5s.
- Support tickets related to chat drop by 80% within 30 days.
- Unified logging and dashboard covering all chat interactions.

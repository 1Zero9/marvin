# Marvin production readiness

Marvin should move through these gates in order. A gate is complete only when its code is deployed to a non-production environment and the listed evidence has been collected.

## Gate 1 — Request and authentication boundary

Status: implemented locally and migrated on the configured Vercel/Prisma database; deployment and hosted verification pending.

- [x] Same-origin checks reject cross-site browser mutations.
- [x] Auth request bodies have byte and field-length limits.
- [x] Sign-in, recovery, reset, setup, and invitation acceptance use database-backed rate limits.
- [x] Rate-limit keys hash client and account identifiers before storage.
- [x] First-user setup is serialized inside the database transaction.
- [x] Invitation acceptance atomically claims a one-time invitation.
- [x] Password hashing uses asynchronous scrypt work so authentication cannot block the request event loop.
- [x] Unknown-account sign-ins perform equivalent password work to reduce account-enumeration timing signals.
- [x] Active sessions are capped per user and expired sessions are removed during sign-in.
- [x] Sensitive account deletion and bulk data exports are rate limited per user.
- [x] Private-media uploads, invitation creation, recipe sharing, and owner-generated reset links have per-user cost limits.
- [x] Public links use `APP_URL`, not the incoming Host header.
- [x] API responses default to `Cache-Control: private, no-store`.
- [x] Baseline CSP and browser security headers are enabled.
- [x] Private and shared application pages opt out of search-engine indexing and archival.
- [x] Apply `20260804130000_rate_limit_buckets`, search indexes, and query-path indexes to the configured Vercel/Prisma database.
- [ ] Verify successful sign-in, recovery, reset, setup, invite, and sign-out flows in staging.
- [ ] Verify 429 responses and `Retry-After` at each public endpoint.

## Gate 2 — Automated release controls

Status: baseline implemented locally.

- [x] `npm run check` runs unit tests and strict TypeScript checks.
- [x] CI installs from the lockfile, runs checks, and creates a production build.
- [x] Add an isolated-Postgres authenticated smoke test for setup, sign-in, cookbook, recipe, meal-log, readiness, and account cleanup flows.
- [x] Add automated accessibility scans for public entry pages and an authenticated cook-page assertion.
- [x] Add an isolated authenticated 390 × 844 route sweep covering every page, dynamic recipe/book routes, search/filter states, horizontal overflow, headings, and WCAG checks.
- [x] Resolve all current production dependency advisories and enforce a moderate-or-higher audit gate in CI.
- [ ] Protect the release branch so CI must pass before merge.

## Gate 3 — API and external-service resilience

Status: resilience, validation, and observability controls implemented locally; staging verification pending.

- [x] Add shared field limits and bounded streaming JSON parsing across all API writes, including recipes, cookbook indexes, checklists, workouts, and shopping.
- [x] Strictly validate calendar-date inputs so impossible dates cannot silently roll into another day.
- [x] Add weighted hourly and daily per-user quotas to AI processing endpoints.
- [x] Add per-user hourly limits to URL/document imports and external ISBN lookups.
- [x] Add explicit timeouts to every AI, email, and public metadata request.
- [x] Bound JSON request streams before parsing on authentication, AI, URL-import, and document-import endpoints.
- [x] Add centralized structured/redacted server logging and per-request correlation IDs for operational failures.
- [x] Add dependency-free liveness and database/configuration readiness endpoints.

## Gate 4 — Performance, UX, and accessibility

Status: mobile fixes, automated assertions, and an authenticated production visual sweep are complete; measurable and assistive-technology gates remain.

- [x] Paginate cookbook index entries at 100 rows and add server-side ingredient/dish search.
- [x] Paginate recipe libraries and cooking history; calculate cooking summaries in PostgreSQL instead of loading every log into the server process.
- [x] Lazily load barcode and index-photo tooling on `/books/add`; enforce a route budget in CI.
- [x] Add PostgreSQL trigram indexes for case-insensitive ingredient, dish, and recipe-title searches.
- [x] Add compound indexes for household libraries, cookbook pages, cooking history, and photo lookup paths.
- [ ] Define representative seed data and run mobile/desktop Lighthouse checks.
- [ ] Run keyboard, screen-reader, zoom, reduced-motion, contrast, and slow-network passes.
- [x] Add a programmatic label to the main cook search field.
- [x] Remove the nested input styling and native duplicate decoration from the mobile cook search; add an authenticated 390 × 844 regression assertion.
- [x] Review authenticated production routes at 390 × 844, including search states, recipe/book details, logging, planning, health, household, and account pages.
- [x] Add user-facing route-error, not-found, and privacy-preserving offline recovery states.
- [ ] Verify empty, error, offline, expired-session, and slow-upload states in staging.

## Gate 5 — Operations and controlled release

Status: local operational foundations implemented; external service configuration and rehearsals pending.

- [x] Enforce required production environment variables before build/start and through readiness checks; maintain separate staging credentials operationally.
- [ ] Configure error monitoring, availability checks, and alert ownership.
- [x] Document database backup, restore-test, migration, application rollback, and incident procedures.
- [ ] Review retention and processor agreements for health data, AI, email, and private media.
- [ ] Run a staging release rehearsal, then a small household beta, before broad availability.

## Required deployment configuration

Copy `.env.example` into the deployment platform and supply real secrets there. Never commit secret values. `APP_URL` must be the canonical HTTPS origin (for example, `https://marvin.example.com`). The application intentionally refuses to generate recovery or invitation links in production when no trusted public origin is configured.

The normal production build script applies migrations before compiling. For build-only verification without changing a database, use:

```sh
npm run check
npx next build
```

Runtime probes:

- `GET /api/health/live` verifies that the application process can respond without contacting dependencies.
- `GET /api/health/ready` returns `200` only when core configuration is present and PostgreSQL responds within three seconds.

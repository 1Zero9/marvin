# Marvin operations runbook

## Release preflight

1. Create a staging deployment from the exact release commit.
2. Confirm `npm run audit:prod`, `npm run check`, the production build, bundle budget, and isolated end-to-end job are green.
3. Set `APP_URL` to the canonical HTTPS origin and configure `DATABASE_URL` and `PRIVATE_BLOB_READ_WRITE_TOKEN`. Keep staging and production credentials separate.
4. Run `npm run validate:env`. Do not deploy when it reports an issue.
5. Take or confirm a recent database backup before applying a migration.
6. Apply migrations in staging, run the Gate 1 authentication tests, then deploy the same commit to production.
7. Confirm `/api/health/live` and `/api/health/ready`, sign-in, search, one representative write, and private-media access.

## Monitoring and triage

- Poll `/api/health/live` for process availability and `/api/health/ready` for dependency readiness. Alert only after two consecutive failures to avoid transient noise.
- Capture platform logs with `X-Request-ID`; every API request receives a newly generated identifier that is also forwarded to route handlers.
- Never log session cookies, password/reset/invitation tokens, image data, email API keys, database URLs, health notes, or full request bodies.
- Alert on sustained 5xx responses, readiness failures, unusual 429 volume, database saturation, and AI/email/blob provider errors.
- During an incident, record start time, affected routes, request IDs, deployment ID, migration version, and the mitigation owner.

## Application rollback

1. Stop further releases and identify the last known-good deployment.
2. If the incident is application-only and the database migration is backward compatible, promote the previous deployment.
3. Verify both health probes and the critical smoke flow.
4. Do not automatically reverse a database migration. Prefer a forward repair migration after checking whether new writes used the changed schema.

## Database backup and restore

- Enable provider-managed point-in-time recovery and document its retention window in the deployment platform.
- Before a schema migration, create an on-demand backup or confirm a recovery point newer than the release candidate.
- At least quarterly, restore the latest backup into an isolated database, run `prisma migrate status`, then execute the authenticated smoke test against that restored copy.
- Record the recovery point, restore duration, row-count spot checks, test result, and operator. A backup is not considered verified until this rehearsal succeeds.
- Never restore a production backup into an environment accessible with shared development credentials.

## Secret rotation

1. Create the replacement credential at the provider.
2. Update staging and verify readiness plus the affected feature.
3. Update production, verify again, then revoke the old credential.
4. Rotate immediately after suspected exposure; invalidate active sessions when session material may be affected.

## Incident closure

Confirm service recovery, preserve relevant redacted logs, communicate user impact, create corrective actions with owners, and update this runbook when the response exposed a missing step.

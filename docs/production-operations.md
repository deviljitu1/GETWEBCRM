# Production operations

Use Node 24 and install with `npm ci --legacy-peer-deps`. Configure the four variables in `.env.example` in Vercel; keep the service-role key server-only. The service-role client is used exclusively for database-backed request throttling. Tenant data uses the authenticated client's RLS.

## Database and initial access

Apply numbered files in `supabase/migrations` in order. For an existing database, apply only unapplied migrations. Migration 00002 preserves existing CRM records, adds permission policies, and enforces tenant relationships on new writes. Migration 00003 validates legacy tenant relationships and reserves the shared login routes; repair any legacy mismatches before applying it.

Use `/login` as the shared entry point. Platform administrators are sent to `/admin`; other authenticated users choose from their active workspace memberships at `/workspaces`. New users without membership see an invitation message. Client-specific `/<workspace>/login` links remain available.

Register and verify the intended administrator's account first. From a trusted SQL session, insert that user's UUID into `public.platform_admins`. For an existing workspace, create its owner membership using the matching organization-specific `owner` role. No user can self-promote. Use `/admin/tenants` to create future workspaces and their verified owners atomically.

Invitations expire after seven days. Share the workspace login URL with the invited person; verified sign-in accepts pending invitations. Invitations do not send emails automatically. Disabled memberships are never reactivated by accepting an invitation.

## Authentication redirects

Set Supabase Authentication → URL Configuration → Site URL to the current production origin (`https://getwebcrm.vercel.app`). Add `https://getwebcrm.vercel.app/auth/callback` and any intended local development callback to the redirect allow list. Google Cloud's authorized redirect URI is the Supabase project's `/auth/v1/callback` URL. Keep preview callbacks limited to project domains you control.

## Release checks

Run `npm run lint`, `npm test`, and `npm run build`. GitHub Actions also applies migrations to a disposable PostgreSQL instance and runs `tests/database/security.sql`. That test transaction rolls back all fixtures. Check the Vercel deployment has reached Ready before testing Google login from the current production domain. Verify one owner and one viewer session, cross-tenant denial, CSV import, property status conflicts, and logout.

## Backups, restore and monitoring

Vercel runs `/api/health/supabase` daily at 06:17 UTC (11:47 AM India time, with Hobby scheduling delay of up to 59 minutes). Each invocation makes three uncached, read-only database checks using the public key and returns availability only. Failures return HTTP 503 and emit `supabase_health_failed` in Vercel logs. Inspect Settings → Cron Jobs to confirm the job is enabled. Scheduled activity can reduce inactivity pausing on Supabase Free, but it does not guarantee uptime, prevent quota restrictions, or automatically restore a paused project. Supabase Pro removes inactivity pausing.

Before using real customer data, verify the hosted Supabase project's backup retention and recovery capabilities. Free-plan availability must not be assumed to provide a recoverable production backup. Export a full PostgreSQL dump with the PostgreSQL client matching the server version, encrypt it, and retain it in private storage outside the database account. A complete recovery plan includes Auth records, CRM tables, migration history, and any Storage objects.

Restore an encrypted backup into a separate non-production Supabase project. Verify record counts, foreign keys, owner/viewer access, and cross-tenant denial, and record the restoration duration and backup timestamp. Do not run restore experiments against production. Enable Vercel/Supabase operational alerts and inspect function errors, database capacity, auth failures, and quota usage. CI success alone does not verify backups or uptime.

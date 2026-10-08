# Production operations

Use Node 24 and install with `npm ci --legacy-peer-deps`. Configure variables in `.env.example` in Vercel; keep the service-role key and Razorpay secrets server-only. The service-role client handles database-backed throttling and verified billing synchronization. Tenant data uses the authenticated client's RLS.

## Database and initial access

Apply numbered files in `supabase/migrations` in order. For an existing database, apply only unapplied migrations. Migration 00002 preserves existing CRM records, adds permission policies, and enforces tenant relationships on new writes. Migration 00003 validates legacy tenant relationships and reserves the shared login routes; repair any legacy mismatches before applying it.

Use `/login` as the shared entry point. Platform administrators are sent to `/admin`; other authenticated users choose from their active workspace memberships at `/workspaces`. New users without membership see an invitation message. Client-specific `/<workspace>/login` links remain available.

Register and verify the intended administrator's account first. From a trusted SQL session, insert that user's UUID into `public.platform_admins`. For an existing workspace, create its owner membership using the matching organization-specific `owner` role. No user can self-promote. Use `/admin/tenants` to create future workspaces and their verified owners atomically.

Invitations expire after seven days. Share the workspace login URL with the invited person; verified sign-in accepts pending invitations. Invitations do not send emails automatically. Disabled memberships are never reactivated by accepting an invitation.

Migration 00006 adds team access controls. Workspace settings can update non-owner roles, disable/reactivate members, and revoke pending invitations. Own access and owner roles cannot be changed through this flow. Disabling membership immediately removes access through RLS without deleting leads.

## Authentication redirects

Set Supabase Authentication → URL Configuration → Site URL to the current production origin (`https://getwebcrm.vercel.app`). Add `https://getwebcrm.vercel.app/auth/callback` and any intended local development callback to the redirect allow list. Google Cloud's authorized redirect URI is the Supabase project's `/auth/v1/callback` URL. Keep preview callbacks limited to project domains you control.

Configure production SMTP and verify account confirmation and password recovery delivery. Add `https://getwebcrm.vercel.app/auth/recovery` to the callback allow list. `/auth/forgot-password` requests a rate-limited recovery link; the same browser must exchange its PKCE code. Authenticated users can set a CRM password at `/auth/password`. Verify these flows with a test mailbox before customer onboarding.

## Release checks

Run `npm run lint`, `npm test`, and `npm run build`. GitHub Actions also applies migrations to a disposable PostgreSQL instance and runs `tests/database/security.sql`. That test transaction rolls back all fixtures. Check the Vercel deployment has reached Ready before testing Google login from the current production domain. Verify one owner and one viewer session, cross-tenant denial, CSV import, property status conflicts, and logout.

## Razorpay subscriptions

Apply migration 00005 before deploying billing routes. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and an independently generated `RAZORPAY_WEBHOOK_SECRET` to Vercel. Start with test keys. Enable all `subscription.*` events at `https://getwebcrm.vercel.app/api/webhooks/razorpay`, using the same webhook secret. Invalid signatures are rejected and processing failures return 503 for Razorpay retries. Events fetch the current subscription from Razorpay; transactional receipts and revision checks handle duplicate and concurrent delivery.

`/admin/billing` displays one active monthly INR plan and actual Razorpay subscription status. Under Payment settings, verify the API connection and enable subscription checkout. Workspace administrators subscribe at `/<workspace>/billing`; checkout uses their authorized workspace and the server-selected monthly plan, with 12 monthly payments. They can continue pending checkout, cancel renewal, and resubscribe after a terminal contract's paid period expires. Existing subscriptions can be recovered under Payment settings. The server verifies provider price and currency. Dates show the confirmed paid period, without inventing a future bill. Manual assignments and payment-enforcement controls are omitted from the main UI; existing enforcement settings are preserved until live checkout and webhook delivery are verified.

Verify checkout, activation, renewal, failed-payment recovery, cancellation, duplicate/out-of-order webhook delivery, and period expiry in test mode. Test contracts never grant live paid access. Configure separate live keys and live webhook secret, set `RAZORPAY_LIVE_ENABLED=true`, redeploy, and perform a controlled live verification before requiring payment. Keep payment enforcement off until then. Enabling it blocks CRM data through RLS without blocking billing management; cancelled subscriptions retain access through their already-paid period. Settings and membership management remain available. Manual subscription records are bookkeeping and do not grant paid access. Use the refresh button to reconcile missed events and monitor `razorpay_webhook_failed` logs. Handle refunds, disputes and tax invoicing through your Razorpay operations process; review workspace entitlement manually after refunds.

## Backups, restore and monitoring

Vercel runs `/api/health/supabase` daily at 06:17 UTC (11:47 AM India time, with Hobby scheduling delay of up to 59 minutes). Each invocation makes three uncached, read-only database checks using the public key and returns availability only. Failures return HTTP 503 and emit `supabase_health_failed` in Vercel logs. Inspect Settings → Cron Jobs to confirm the job is enabled. Scheduled activity can reduce inactivity pausing on Supabase Free, but it does not guarantee uptime, prevent quota restrictions, or automatically restore a paused project. Supabase Pro removes inactivity pausing.

Before using real customer data, verify the hosted Supabase project's backup retention and recovery capabilities. Free-plan availability must not be assumed to provide a recoverable production backup. Export a full PostgreSQL dump with the PostgreSQL client matching the server version, encrypt it, and retain it in private storage outside the database account. A complete recovery plan includes Auth records, CRM tables, migration history, and any Storage objects.

Restore an encrypted backup into a separate non-production Supabase project. Verify record counts, foreign keys, owner/viewer access, and cross-tenant denial, and record the restoration duration and backup timestamp. Do not run restore experiments against production. Enable Vercel/Supabase operational alerts and inspect function errors, database capacity, auth failures, and quota usage. CI success alone does not verify backups or uptime.

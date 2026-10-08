# Real Estate Builder CRM SaaS - Master Build Specification

**Product:** Multi-tenant real-estate sales CRM

**Initial tenant:** GrahSiddhi Construction

**Status:** Build specification for V1

**Primary stack:** Next.js + TypeScript + Tailwind CSS + shadcn/ui + Supabase

**Principle:** Build a focused CRM that works for GrahSiddhi now, while making every core record safe to reuse for future builder organizations. Do not build a one-off client database.

---

## 1. Product vision

Create a web application that helps real-estate builders manage the full sales journey in one place:

```text
Lead captured -> qualified -> follow-up -> site visit -> booking -> payment tracking -> customer relationship
```

The first deployment serves GrahSiddhi Construction. The product must later support multiple independent builders as paid SaaS tenants without rewriting its core data model, authorization, or navigation.

### Initial brand context: GrahSiddhi Construction

GrahSiddhi is positioned as a premium, trustworthy, transparent, and approachable real-estate and home-construction brand. Its initial workspace should reflect that tone, while the SaaS itself remains brand-configurable per organization.

| Brand token | Value | Initial use |
|---|---:|---|
| Navy | `#1F2F3A` | Sidebar, primary actions, headings |
| Royal gold | `#C9A24A` | Primary highlights, CTA accents, key statuses |
| Dark slate | `#2E3F4A` | Secondary dark surfaces |
| Leaf green | `#4F7A5A` | Positive/success states only |
| Off-white | `#F5F2EB` | App/page background accent |
| Dark text | `#222222` | Body text |
| Font | Poppins | Default UI typography; Montserrat only for optional display highlights |

Use a 60-30-10 balance: mostly light, readable workspace surfaces; navy for structure; gold used sparingly for premium emphasis. Avoid clutter, excessive color, decorative shadows, and generic stock imagery. Use real project, construction-site, completed-home, and client-interaction images when imagery is needed.

Customer-facing copy may use simple Hindi-English where GrahSiddhi chooses it. Internal CRM labels should remain concise and unambiguous.

---

## 2. Outcomes and goals

### Business outcomes

1. No sales lead is lost because it was written in a notebook, spreadsheet, or personal chat.
2. Sales managers can see lead status, assignment, overdue work, visits, bookings, and inventory in minutes.
3. Sales executives get a clear daily work queue.
4. Inventory cannot be accidentally double-booked.
5. The same product can be configured for the next builder with tenant isolation, branding, roles, and plan limits.

### Product goals for V1

- Centralize manually entered leads and CSV-imported leads.
- Track a lead's owner, pipeline stage, notes, follow-ups, and site visits.
- Manage projects, towers/buildings, units, availability, and pricing.
- Convert leads into customers and bookings.
- Record payment schedules and payments as operational tracking, not accounting.
- Provide role-based dashboards, reports, document storage, audit history, and CSV export.
- Be deployable at near-zero initial infrastructure cost, subject to provider free-tier limits.

### Explicit non-goals for V1

- n8n, WhatsApp, SMS, Meta Lead Ads, Google Ads, or any paid lead-source connection.
- Razorpay or customer subscription billing.
- Full accounting, GST invoices, payroll, procurement, construction project management, or native mobile apps.
- AI chatbot, scoring model, or automated marketing journeys.
- Per-tenant custom source-code forks.

Keep seams for these later features; do not fabricate integrations or put payment secrets in the client application.

---

## 3. Architecture decision

### Recommended implementation

```text
Browser
  -> Next.js App Router application
       - React UI
       - Server Components
       - Server Actions / Route Handlers
       - authorization and validation boundary
  -> Supabase
       - PostgreSQL
       - Auth
       - Storage
       - Row Level Security (RLS)
       - optional Realtime later
```

Use **Next.js with TypeScript**, not a standalone React SPA. Use **no separate Node/Express service in V1**. Next.js server code is sufficient for privileged workflows, validated mutations, imports, exports, and later webhook endpoints.

### Application libraries

| Need | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript, current stable release |
| Styling | Tailwind CSS |
| Components | shadcn/ui, Radix primitives where used by shadcn |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Database/Auth/Storage | Supabase |
| Date/time | date-fns or Luxon; store all timestamps in UTC |
| Icons | lucide-react |
| Testing | Vitest, React Testing Library, Playwright |

### Architectural rules

- Treat the browser as untrusted. UI permissions improve usability; RLS and server-side checks enforce security.
- Use the Supabase anonymous key only in public browser code. Never expose the service-role key.
- Use server actions for ordinary authenticated mutations and route handlers for public APIs, imports, webhooks, and future integrations.
- Validate every write with Zod and enforce authorization again on the server.
- Keep business rules in typed server-side functions, not only in React components.
- Prefer database constraints and transactions for correctness-critical rules such as booking a unit.
- Add `organization_id` to every tenant-owned table from the beginning.

---

## 4. V1 scope and modules

| Module | V1 capability | Priority |
|---|---|---|
| Authentication and workspace | Login, invite, organization membership, role checks | Must |
| Dashboard | Role-aware KPIs, work queue, pipeline, inventory snapshot | Must |
| Leads | Create, import, assign, qualify, stage, notes, activity timeline | Must |
| Follow-ups | Due, overdue, upcoming, completed follow-up tasks | Must |
| Site visits | Schedule, confirm, complete, cancel/no-show, outcomes | Must |
| Projects and inventory | Projects, towers, units, pricing, availability | Must |
| Customers | Customer record and connected leads/bookings/documents | Must |
| Bookings | Reserve a unit, booking details, transactional status | Must |
| Payment tracking | Schedule, record payments, pending/overdue visibility | Important |
| Documents | Attach tenant-scoped documents to core records | Important |
| Team and settings | Users, roles, lead stages, lead sources, organization branding | Important |
| Reports and export | Pipeline, source, agent, visits, bookings, payments | Important |
| Audit log | Important changes and who made them | Important |

### Recommended initial pipeline

`new -> contacted -> qualified -> site_visit_scheduled -> site_visit_completed -> negotiation -> booked -> lost`

Do not hard-code this in the UI. Seed it for GrahSiddhi through configurable `lead_stages`; preserve the immutable stage key for analytics and safe migration.

---

## 5. Roles and permission model

Use a membership model. A user may belong to more than one organization, with an independent role in each.

| Role | Typical permissions |
|---|---|
| Platform super admin | Support/operations only; manages SaaS plans and organizations; never a normal tenant role |
| Organization owner | Full workspace control, billing/settings, all records, members |
| Organization admin | Full operational control; optionally cannot alter billing/owner status |
| Sales manager | All CRM records, team visibility, assignment, reports; no billing or role policy changes |
| Sales executive | Assigned leads by default; create leads, activities, follow-ups, visits; create booking only if enabled |
| Telecaller | Assigned leads and follow-ups; no booking/payment/inventory edits |
| Accountant | Read bookings/customers; create and reconcile payment records; no lead-assignment admin |
| Viewer | Read-only, module-limited access |

Implement roles as permissions, not `if (role === ...)` checks scattered through code. Seed the standard roles, then map them to permission keys such as `leads.read.all`, `leads.update.assigned`, `units.update`, `bookings.create`, `payments.record`, and `settings.manage`.

V1 may use fixed seeded role definitions. The schema should permit organization-specific role overrides later.

---

## 6. Primary workflows

### 6.1 Lead intake and assignment

1. An authorized user creates a lead or imports a validated CSV.
2. The app normalizes phone and email values; it checks for likely duplicates in the current organization.
3. The lead receives a source, optional project interest, owner, initial stage, and timeline entry.
4. A sales manager assigns/reassigns the lead. Assignment is recorded in `lead_assignments` and the timeline.
5. The owner receives an in-app notification and creates the next follow-up.
6. A lead without a next follow-up is visibly flagged, except after booked/lost closure.

**Duplicate rule:** warn when normalized phone matches a non-lost lead in the same organization. Let a manager explicitly merge or continue only with a reason; never silently create a second active lead.

### 6.2 Follow-up execution

1. The dashboard and Follow-ups page show overdue, today, and upcoming items.
2. User opens the lead, records call/meeting outcome and optional note.
3. User marks the task complete and creates the next task when applicable.
4. Lead stage can change only through an authorized update. The activity log records before/after values.
5. Managers can review missed/overdue follow-ups by owner.

### 6.3 Site visit

1. Sales user schedules a visit against a lead and project.
2. Lead receives/keeps the `site_visit_scheduled` stage.
3. Visit is confirmed, completed, cancelled, or marked no-show.
4. On completion, record attendee, outcome, notes, and optionally a requested unit.
5. The team schedules the next follow-up or moves the lead to negotiation.

### 6.4 Lead to customer and booking

1. Authorized user creates/selects a customer from the lead contact.
2. User selects an available unit and requests booking.
3. A server-side transaction locks the unit row, verifies it is still available, creates a booking, and marks the unit reserved/booked according to business rules.
4. System creates a payment schedule from the selected plan or manual milestones.
5. Lead becomes `booked`; the timeline and audit log include the booking reference.
6. Cancellation is an explicit action with a reason. It releases or retains the unit only through a manager-authorized transaction.

### 6.5 Payment tracking

1. Accountant or authorized manager records payment date, amount, reference, mode, and optional receipt document.
2. The server calculates scheduled amount, paid amount, balance, and schedule status.
3. A payment is never edited destructively after reconciliation; use reversal/correction records with audit history.
4. This is operational collection tracking, not a statutory accounting ledger in V1.

### 6.6 Organization onboarding

1. Platform admin creates organization and owner membership.
2. Seed default roles, lead stages, sources, defaults, plan/subscription, and usage row.
3. Owner configures brand, business details, sales team, projects, and inventory.
4. Owner invites users by email; invitation expires and cannot grant a role beyond inviter authority.

---

## 7. Screens and navigation

### Application shell

```text
Top bar: organization switcher | global search later | notifications | user menu
Sidebar: Dashboard
         Leads
         Follow-ups
         Site Visits
         Projects
         Inventory
         Customers
         Bookings
         Payments
         Reports
         Documents
         Settings
```

Hide pages a user cannot access. Do not treat hidden navigation as authorization.

### Required V1 screens

| Route | Screen details |
|---|---|
| `/login`, `/reset-password`, `/accept-invite` | Supabase Auth flows |
| `/app/[orgSlug]/dashboard` | KPIs, leads by stage/source, due work, recent activity, available/reserved units |
| `/app/[orgSlug]/leads` | Filterable table, saved views later, create/import actions |
| `/app/[orgSlug]/leads/[leadId]` | Summary, stage/owner controls, notes, activities, follow-ups, visits, documents, linked booking |
| `/app/[orgSlug]/follow-ups` | Queue grouped by overdue/today/upcoming and assignee |
| `/app/[orgSlug]/site-visits` | Calendar/list toggle, visit form, outcomes |
| `/app/[orgSlug]/projects` | Project cards/table, project overview |
| `/app/[orgSlug]/projects/[projectId]` | Overview, towers, unit inventory, leads, visits, bookings |
| `/app/[orgSlug]/inventory` | Units table/grid with project/tower/status filters |
| `/app/[orgSlug]/customers/[customerId]` | Contacts, bookings, payment overview, documents |
| `/app/[orgSlug]/bookings/[bookingId]` | Booking, unit, customer, schedule, payments, documents |
| `/app/[orgSlug]/reports` | Filters plus table/chart exports; use server-side aggregation |
| `/app/[orgSlug]/settings/*` | Organization, team, roles, pipeline, sources, documents, subscription (read-only initially) |
| `/admin/*` | Separate platform-admin area; never shown to ordinary organization members |

Use accessible forms, keyboard-friendly tables, clear empty states, destructive-action confirmations, and mobile-safe responsive layouts. The sales team will often use smaller screens, but V1 remains web-first.

---

## 8. Database design

### Conventions

- PostgreSQL UUID primary keys: `id uuid primary key default gen_random_uuid()`.
- `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()` on mutable records.
- Store money as `numeric(14,2)`, never floating point.
- Store timestamps in UTC; store organization IANA timezone (for example `Asia/Kolkata`) for display and due-date logic.
- Use `citext` for case-insensitive email if available; normalize phone to E.164-compatible digits in application code.
- Tenant-owned tables have a non-null `organization_id` referencing `organizations(id)`.
- Add a trigger to update `updated_at` and a trigger/function to block tenant ID changes after insert.
- Prefer lookup/configuration tables or checked text values over PostgreSQL enums for tenant-configurable concepts.

### 8.1 Platform, tenant, access, and configuration tables

| Table | Columns | Constraints and indexes |
|---|---|---|
| `organizations` | `id`, `name varchar(160)`, `slug varchar(80)`, `legal_name`, `email`, `phone`, `website`, `timezone`, `currency_code char(3) default 'INR'`, `logo_path`, `brand_config jsonb default '{}'`, `status text`, timestamps | `unique(slug)`; status check: `active`, `suspended`, `archived`; index `(status)` |
| `profiles` | `id uuid primary key references auth.users(id)`, `full_name`, `avatar_path`, `phone`, timestamps | Auth user has one global profile; no organization data here |
| `roles` | `id`, `organization_id nullable`, `key`, `name`, `description`, `is_system boolean`, timestamps | `unique(organization_id, key)`; global roles only for platform use |
| `permissions` | `key primary key`, `module`, `description` | Seed controlled permission catalog |
| `role_permissions` | `role_id`, `permission_key` | composite primary key `(role_id, permission_key)` |
| `organization_members` | `id`, `organization_id`, `user_id`, `role_id`, `status`, `joined_at`, `invited_by`, timestamps | `unique(organization_id, user_id)`; index `(user_id, status)`; status check: `invited`, `active`, `disabled` |
| `organization_invitations` | `id`, `organization_id`, `email`, `role_id`, `token_hash`, `expires_at`, `accepted_at`, `invited_by`, timestamps | unique active invite per org/email; never store raw token |
| `lead_stages` | `id`, `organization_id`, `key`, `name`, `sort_order`, `color`, `is_closed`, `outcome`, `is_default`, timestamps | `unique(organization_id, key)`, `unique(organization_id, sort_order)`; outcome check `open`, `won`, `lost` |
| `lead_sources` | `id`, `organization_id`, `name`, `key`, `is_active`, timestamps | `unique(organization_id, key)` |
| `custom_field_definitions` | `id`, `organization_id`, `entity_type`, `key`, `label`, `field_type`, `options jsonb`, `is_required`, `is_active`, `sort_order` | `unique(organization_id, entity_type, key)`; define now, UI can be later |

`brand_config` should allow per-tenant colors, fonts, logo and support contact data. The codebase supplies safe defaults and must validate CSS color values before rendering them.

### 8.2 Projects and inventory tables

| Table | Columns | Constraints and indexes |
|---|---|---|
| `projects` | `id`, `organization_id`, `name`, `slug`, `code`, `description`, `address_line1`, `city`, `state`, `pincode`, `status`, `launch_date`, `completion_date`, `cover_image_path`, `metadata jsonb`, timestamps | `unique(organization_id, slug)`, `unique(organization_id, code)` where code is not null; index `(organization_id, status)` |
| `project_towers` | `id`, `organization_id`, `project_id`, `name`, `code`, `sort_order`, `floors_count`, timestamps | `unique(project_id, name)`; composite FK concept enforced by matching tenant in server/RLS; index `(organization_id, project_id)` |
| `units` | `id`, `organization_id`, `project_id`, `tower_id nullable`, `unit_number`, `floor_number`, `unit_type`, `bedrooms numeric(3,1)`, `area_sqft numeric(12,2)`, `carpet_area_sqft numeric(12,2)`, `base_price numeric(14,2)`, `quoted_price numeric(14,2)`, `status`, `facing`, `metadata jsonb`, timestamps | `unique(project_id, tower_id, unit_number)`; status check `available`, `on_hold`, `reserved`, `booked`, `blocked`; index `(organization_id, project_id, status)`; `check(base_price >= 0)` |
| `unit_status_history` | `id`, `organization_id`, `unit_id`, `previous_status`, `new_status`, `reason`, `changed_by`, `booking_id nullable`, timestamps | index `(unit_id, created_at desc)` |
| `unit_holds` | `id`, `organization_id`, `unit_id`, `lead_id nullable`, `held_by`, `held_at`, `expires_at`, `released_at`, `reason` | Partial unique index: one active hold per `unit_id` where `released_at is null`; index active expiration |

For V1, a unit is a saleable inventory item. Do not delete units that have bookings; archive/block them instead.

### 8.3 CRM and sales tables

| Table | Columns | Constraints and indexes |
|---|---|---|
| `leads` | `id`, `organization_id`, `first_name`, `last_name`, `full_name`, `phone`, `phone_normalized`, `email`, `email_normalized`, `source_id nullable`, `stage_id`, `assigned_to nullable`, `project_id nullable`, `budget_min`, `budget_max`, `property_interest`, `city`, `notes`, `next_followup_at nullable`, `lost_reason`, `custom_fields jsonb default '{}'`, `created_by`, timestamps | `check(budget_min <= budget_max)`; indexes `(organization_id, stage_id, created_at desc)`, `(organization_id, assigned_to, next_followup_at)`, `(organization_id, phone_normalized)`, `(organization_id, project_id)` |
| `lead_assignments` | `id`, `organization_id`, `lead_id`, `assigned_to`, `assigned_by`, `reason`, `assigned_at` | index `(lead_id, assigned_at desc)`; server ensures assignee is active member |
| `lead_activities` | `id`, `organization_id`, `lead_id`, `activity_type`, `body`, `metadata jsonb`, `performed_by nullable`, `occurred_at` | index `(lead_id, occurred_at desc)`; types include `created`, `note`, `call`, `stage_changed`, `assigned`, `visit`, `booking`, `document` |
| `follow_ups` | `id`, `organization_id`, `lead_id`, `assigned_to`, `type`, `due_at`, `status`, `priority`, `outcome`, `notes`, `completed_at`, `completed_by`, `created_by`, timestamps | index `(organization_id, assigned_to, status, due_at)`; status check `pending`, `completed`, `cancelled`; open task index by lead |
| `site_visits` | `id`, `organization_id`, `lead_id`, `project_id`, `unit_id nullable`, `scheduled_at`, `assigned_to`, `status`, `confirmed_at`, `completed_at`, `outcome`, `attendee_count`, `notes`, `created_by`, timestamps | indexes `(organization_id, scheduled_at)`, `(organization_id, assigned_to, status, scheduled_at)`; status check `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show` |
| `customers` | `id`, `organization_id`, `display_name`, `primary_phone`, `phone_normalized`, `primary_email`, `email_normalized`, `address jsonb`, `tax_identifier nullable`, `source_lead_id nullable`, `custom_fields jsonb`, `created_by`, timestamps | index `(organization_id, phone_normalized)`; `unique(organization_id, source_lead_id)` where source_lead_id is not null |
| `customer_contacts` | `id`, `organization_id`, `customer_id`, `name`, `relationship`, `phone`, `email`, `is_primary`, timestamps | partial unique index one primary contact per customer |

### 8.4 Booking, payment, document, and operational tables

| Table | Columns | Constraints and indexes |
|---|---|---|
| `bookings` | `id`, `organization_id`, `booking_number`, `lead_id nullable`, `customer_id`, `project_id`, `unit_id`, `status`, `booking_date`, `agreed_value numeric(14,2)`, `booking_amount numeric(14,2)`, `cancelled_at`, `cancellation_reason`, `created_by`, timestamps | `unique(organization_id, booking_number)`; partial unique index one active booking per unit where status in `reserved`, `confirmed`; index `(organization_id, status, booking_date desc)`; `check(agreed_value >= 0 and booking_amount >= 0)` |
| `payment_schedules` | `id`, `organization_id`, `booking_id`, `label`, `due_date`, `amount_due numeric(14,2)`, `status`, `sort_order`, timestamps | `unique(booking_id, sort_order)`; index `(organization_id, status, due_date)`; status `pending`, `partial`, `paid`, `waived`, `overdue` |
| `payments` | `id`, `organization_id`, `booking_id`, `payment_schedule_id nullable`, `receipt_number`, `amount numeric(14,2)`, `paid_at`, `payment_method`, `reference_number`, `status`, `notes`, `receipt_document_id nullable`, `recorded_by`, `reversed_payment_id nullable`, timestamps | `unique(organization_id, receipt_number)`; index `(organization_id, booking_id, paid_at desc)`; `check(amount > 0)`; status `recorded`, `reversed` |
| `documents` | `id`, `organization_id`, `bucket`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `entity_type`, `entity_id`, `visibility`, `uploaded_by`, timestamps | `unique(bucket, storage_path)`; index `(organization_id, entity_type, entity_id)`; storage path must start with organization UUID |
| `notifications` | `id`, `organization_id`, `user_id`, `type`, `title`, `body`, `href`, `read_at`, `metadata jsonb`, timestamps | index `(user_id, read_at, created_at desc)` |
| `audit_logs` | `id bigint generated always as identity`, `organization_id nullable`, `actor_user_id nullable`, `action`, `entity_type`, `entity_id`, `request_id`, `before_data jsonb`, `after_data jsonb`, `ip_hash`, `user_agent`, `created_at` | append-only; indexes `(organization_id, entity_type, entity_id, created_at desc)` and `(organization_id, created_at desc)` |

### 8.5 SaaS subscription and usage tables

| Table | Columns | Constraints and indexes |
|---|---|---|
| `plans` | `id`, `key`, `name`, `description`, `is_public`, `is_active`, `price_monthly numeric(12,2)`, `price_yearly numeric(12,2)`, `currency_code`, timestamps | `unique(key)`; price non-negative |
| `plan_features` | `id`, `plan_id`, `feature_key`, `enabled boolean`, `limit_value integer nullable`, `config jsonb` | `unique(plan_id, feature_key)`; `null` limit means unlimited only when enabled |
| `subscriptions` | `id`, `organization_id`, `plan_id`, `status`, `billing_provider nullable`, `provider_customer_id nullable`, `provider_subscription_id nullable`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `trial_ends_at`, timestamps | one current subscription enforced with partial unique index; status `trialing`, `active`, `past_due`, `cancelled`, `paused` |
| `organization_usage` | `organization_id primary key`, `active_members_count`, `leads_count`, `projects_count`, `storage_bytes`, `updated_at` | cache/counter only; periodically reconcile from canonical tables |
| `feature_overrides` | `id`, `organization_id`, `feature_key`, `enabled nullable`, `limit_value nullable`, `reason`, `expires_at`, timestamps | `unique(organization_id, feature_key)` |
| `integration_connections` | `id`, `organization_id`, `provider`, `status`, `config_encrypted`, `connected_by`, `last_synced_at`, timestamps | `unique(organization_id, provider)`; never return encrypted secrets to client |
| `integration_events` | `id`, `organization_id`, `provider`, `external_event_id`, `event_type`, `payload jsonb`, `status`, `attempt_count`, `processed_at`, `error_message`, timestamps | `unique(provider, external_event_id)` for idempotency; index retryable events |

### Relationship summary

```text
organization
  -> members -> profiles
  -> projects -> towers -> units -> bookings -> payment schedules -> payments
  -> lead stages / lead sources
  -> leads -> activities / follow-ups / site visits / assignments
  -> leads -> customers -> bookings
  -> documents / notifications / audit logs
  -> subscription -> plan -> plan features
```

### Critical transaction: book a unit

Implement as a PostgreSQL function or a server action using an RPC transaction. The procedure must:

1. Verify caller has `bookings.create` permission in the target organization.
2. Lock the requested unit using `SELECT ... FOR UPDATE`.
3. Confirm organization/project/customer/lead all belong to the same organization.
4. Confirm unit is `available` (or an explicitly authorized active hold owned by the lead).
5. Create the booking and schedules.
6. Update the unit status and write `unit_status_history`.
7. Update the lead stage and write activities/audit log.
8. Commit or roll back everything together.

Never rely only on a front-end unit status check.

---

## 9. Multi-tenancy, RLS, and security

### Tenancy model

Use shared-schema, shared-database multitenancy. Every organization has its own logical workspace. The tenant key is `organization_id`; do not create a Supabase project, schema, or database per builder in V1.

The active organization is selected by URL slug and validated against the signed-in user's active membership. Do not trust an organization ID submitted by the browser.

### RLS baseline

1. Enable RLS on every application table and on Storage objects.
2. Create security-definer helper functions such as `is_org_member(org_id)`, `has_org_permission(org_id, permission_key)`, and `current_org_role(org_id)` with a safe `search_path`.
3. For every tenant table, permit `SELECT` only where `is_org_member(organization_id)` is true.
4. For `INSERT`, require membership and ensure `organization_id` equals the permitted workspace; server code supplies the organization ID.
5. For `UPDATE` and `DELETE`, require the appropriate permission. For user-scoped records, apply assignment restrictions only where the role needs them.
6. Sensitive tables (`subscriptions`, `integration_connections`, `audit_logs`, `role_permissions`) should have restrictive direct-client policies and be changed through server-side actions only.
7. Platform admin bypass must be explicit and rare. Do not casually use the service-role client for regular user requests.

Example conceptual lead-read policy:

```sql
using (
  is_org_member(organization_id)
  and has_org_permission(organization_id, 'leads.read.all')
  or (
    has_org_permission(organization_id, 'leads.read.assigned')
    and assigned_to = auth.uid()
  )
)
```

Write the real policy with parentheses and tests. A permissive boolean error can expose another builder's data.

### Storage policy

- Use private buckets only: `organization-documents` and `organization-assets`.
- Store objects under `organizations/{organization_id}/{entity_type}/{entity_id}/{uuid}-{safe-file-name}`.
- Generate signed URLs on demand, with a short expiry.
- Validate MIME type and maximum file size server-side before upload authorization.
- RLS/storage policy extracts the organization UUID from the path and checks membership.
- V1 allowlist: PDF, PNG, JPEG, WebP, DOCX, XLSX. Reject executable and HTML/SVG uploads unless a later reviewed use case needs them.

### Further security controls

- Use Supabase Auth email/password or magic link; require password reset and verified email for invitations.
- Rate-limit login, invite acceptance, CSV import, export, and future public endpoints.
- Use CSRF-aware server actions/route handlers; verify Supabase session server-side.
- Sanitize rich text if introduced; V1 notes should be plain text.
- Hash or redact phone/email in application logs; never log access tokens, passwords, raw invitation tokens, or provider secrets.
- Use secure environment variables for server-only credentials.
- Add a content-security policy and secure response headers before production.
- Record audit events for permissions, invitations, exports, deletion/archival, unit status, booking, payment, and configuration changes.

---

## 10. Subscription-ready feature control

Create the tables and a server-side feature-gate layer now, but do not integrate a payment provider in V1.

### Example plan matrix (guidance, not a final price list)

| Feature | Starter | Growth | Business |
|---|---:|---:|---:|
| Active users | 5 | 15 | 50 |
| Active projects | 2 | 10 | Unlimited |
| Leads/month | 500 | 5,000 | 25,000 |
| Storage | 2 GB | 20 GB | 100 GB |
| Basic CRM | Yes | Yes | Yes |
| Advanced reports | No | Yes | Yes |
| Custom fields | No | Yes | Yes |
| Integrations/API | No | Add-on | Yes |
| Automation | No | Add-on | Yes |

Implement `canUseFeature(orgId, featureKey)` and `assertWithinLimit(orgId, metric, increment)` only on the server. Cache the effective entitlement but make the database subscription/override state the source of truth. Gracefully block new creation at a limit; do not erase existing customer data.

Seed GrahSiddhi with an internal `business` or `pilot` plan and an active subscription row. This validates the architecture without charging anyone.

---

## 11. API and integration readiness

### V1 interfaces

- Server actions for authenticated CRM mutations.
- Route handler for CSV import with validation, duplicate preview, and idempotent job record.
- Route handler for CSV exports that checks permission and writes an audit event.
- Health endpoint with no sensitive data.

### Future integration boundary

```text
External provider -> authenticated webhook/worker route -> integration_events
                  -> idempotent processor -> CRM tables + audit/activities
```

Each incoming event needs a provider name, externally stable event ID, raw payload, signature verification result, processing status, retry count, and error record. This allows safe later integration with Meta Lead Ads, Google Ads, WhatsApp, email/SMS, n8n, and Razorpay.

Do not make a direct provider call from a client component. Verify webhook signatures on the server. Design every processor to be idempotent because providers can retry deliveries.

### Deferred integrations

| Integration | Future use | Preparation in V1 |
|---|---|---|
| Meta / Google lead sources | Automatically create/dedupe leads | Sources, external IDs in `metadata`, event inbox |
| WhatsApp / SMS / email | Follow-up reminders and templates | Notification domain and consent fields later |
| n8n | Optional cross-tool workflows | Webhook/event boundary; no dependency now |
| Razorpay | SaaS subscription billing, not customer booking collection initially | Plans, subscriptions, provider fields, webhook event processing |
| Public API | Partner integrations | Permission catalog, API token table later, versioned route namespace |

---

## 12. Reporting and dashboard definitions

All reports must be scoped to the organization and respect the viewer's permissions. Use server-side filtered queries; do not load every lead into the browser to calculate charts.

### Dashboard metrics

- Leads created: today, this week, selected period.
- Open leads by stage.
- Leads assigned/unassigned.
- Follow-ups: overdue, due today, upcoming.
- Site visits: scheduled, completed, no-show.
- Unit inventory: available, held, reserved, booked.
- Bookings: count and agreed value in selected period.
- Payments: collected, due, overdue in selected period.

### V1 reports

- Lead funnel and conversion by stage.
- Lead source performance.
- Sales executive workload and follow-up completion.
- Site visit outcomes and visit-to-booking conversion.
- Project/unit availability and booking summary.
- Payment schedule ageing.

Every report filter should include date range and, where relevant, project, source, stage, owner, and status. Export results using the exact active filters and audit each export.

---

## 13. Deployment, environments, backups, and operations

### Environments

| Environment | Purpose |
|---|---|
| Local | Development using local environment variables and optionally Supabase CLI |
| Preview | Pull-request preview; use non-production Supabase data only |
| Production | GrahSiddhi/live tenants only |

Deploy Next.js to Vercel initially or an equivalent serverless platform. Use Supabase hosted Postgres/Auth/Storage. Both may begin on free tiers, but actively monitor quotas, backups, bandwidth, function limits, and provider policy changes before onboarding more tenants.

### Database delivery

- Keep migrations in source control and apply in order.
- Seed only safe demo/default configuration; do not seed production secrets.
- Require migration review for RLS, constraints, functions, and indexes.
- Build a staging/preview verification checklist before production migration.

### Backups and recovery

- Confirm the chosen Supabase plan's point-in-time recovery and backup retention before treating it as sufficient.
- At minimum, schedule encrypted periodic logical exports of critical production tables to secure storage when the product reaches live use. Test a restore into a non-production environment.
- Track Storage documents separately in the recovery plan; database backups do not automatically prove file recovery.
- Record a recovery owner, target recovery time, and target recovery point as the product becomes paid.

### Audit retention

Keep audit logs append-only and retain them for at least 12 months initially, subject to client contract and local legal advice. Use archival/partitioning later if volume increases. Do not put full sensitive document content or credentials in audit JSON.

---

## 14. Non-functional requirements

| Area | V1 expectation |
|---|---|
| Availability | Best-effort SaaS on managed providers; maintenance communicated in advance |
| Performance | Core list views under 2 seconds for typical filtered tenant data; paginate server-side |
| Scalability | Index all common tenant/filter paths; no N+1 queries; use cursor/page pagination |
| Reliability | Transactional booking/payment operations; idempotent imports/webhooks |
| Privacy | Strict tenant isolation; least privilege; private storage; no secrets in client bundle |
| Accessibility | Keyboard navigation, visible focus states, form labels/errors, sufficient contrast |
| Responsive design | Functional on mobile widths; optimized desktop workflows |
| Observability | Structured server logs, error monitoring, request IDs, audit trails |
| Data quality | Required fields, normalized contacts, duplicate warnings, referential integrity |
| Localization | India-first INR and `Asia/Kolkata`; keep dates/currency configurable per tenant |

Initial scale target: a few tenants, tens of users per tenant, and tens of thousands of records per tenant. Design correctly for growth but do not prematurely add queues, microservices, Elasticsearch, or Kubernetes.

---

## 15. Testing strategy

### Automated tests

- **Unit:** Zod schemas, amount/status calculations, entitlement logic, phone normalization, date/due logic.
- **Database/RLS integration:** each role can see/change only expected data; a user from organization A can never query organization B data; storage access is isolated.
- **Server actions/API:** validation, permission denial, transactional booking, import dedupe, export audit logging.
- **Component:** form validation, empty/error/loading states, permission-aware controls.
- **End-to-end:** sign in, invite acceptance, lead lifecycle, follow-up completion, visit completion, booking, payment entry, CSV import/export.

### Mandatory security regression cases

1. Change `organization_id` in browser request and verify write/read is denied.
2. Attempt direct REST query for another tenant's lead, document, booking, and payment.
3. Attempt booking the same unit in two concurrent sessions; exactly one succeeds.
4. Attempt a payment modification after reversal rules apply; audit trail remains complete.
5. Ensure disabled member loses access immediately.
6. Ensure signed document URL expires and cannot cross organization path boundaries.

### Manual acceptance testing

Use a realistic GrahSiddhi test dataset: multiple projects, units, agents, duplicate leads, no-show visits, lost leads, a confirmed booking, partial payments, and one cancellation. Have an actual sales user run daily follow-ups before calling V1 ready.

---

## 16. Development phases and staged implementation plan

### Phase 0 - Foundation (week 1)

- Initialize Next.js TypeScript project, Tailwind, shadcn/ui, linting, formatting, tests, and CI.
- Create Supabase project/environment configuration.
- Add migration framework, `organizations`, profiles, memberships, roles/permissions, audit scaffold, and baseline RLS.
- Implement login, logout, protected app shell, organization resolution, and GrahSiddhi theme tokens.
- Add production/preview/local environment documentation.

**Exit criteria:** A user can sign in, access only their organization, and an RLS test proves cross-tenant denial.

### Phase 1 - Leads and daily sales work (weeks 2-3)

- Lead sources, configurable stages, leads, assignments, activities, follow-ups.
- Lead list/detail/create/edit and basic CSV import.
- Personal/team dashboard work queues and in-app notifications.
- Team membership/invites and role-based controls.

**Exit criteria:** Team can operate a lead from creation through qualified/lost with a visible next action and history.

### Phase 2 - Projects, inventory, and visits (weeks 4-5)

- Projects, towers, units, unit status history, holds.
- Unit list/grid and project detail.
- Site visit scheduling, completion/no-show outcomes, lead timeline updates.
- Dashboard pipeline/inventory metrics.

**Exit criteria:** Sales team can identify available units and record the full site-visit journey.

### Phase 3 - Booking and payment tracking (weeks 6-7)

- Customers/contacts, transactional booking flow, payment schedules, payments, documents.
- Race-condition-safe unit reservation/booking implementation.
- Booking/payment reports and complete audit events.

**Exit criteria:** A confirmed booking reliably reserves one unit, has a customer and schedule, and cannot be double-booked.

### Phase 4 - Reporting, polish, and pilot (weeks 8-9)

- Operational reports, filtered export, admin settings, error/loading/empty states.
- Accessibility, responsive QA, performance/index review.
- Pilot with GrahSiddhi, training, feedback session, and issue triage.

**Exit criteria:** Users complete normal daily work without spreadsheets for the covered workflow; critical defects are resolved.

### Phase 5 - SaaS hardening after pilot

- Subscription/admin screens, feature gates, usage reconciliation.
- Organization self-onboarding only after the onboarding process is repeatable.
- API tokens/integrations, then paid provider work only when demand validates it.
- Improve observability, backup/restore tests, policy review, and support workflows.

---

## 17. Pricing and business model guidance

Start as a productized implementation plus recurring software/service, not as a single fixed custom-development project.

### Suggested commercial structure

1. **Pilot/implementation fee:** Covers configuration, migration/import assistance, branding, training, and agreed initial customization.
2. **Monthly platform fee:** Covers hosted CRM access, maintenance, backups/monitoring as contracted, and standard support.
3. **Usage/seat or plan tiers:** Introduce after the second/third tenant validates what actually varies by builder.
4. **Paid add-ons:** Lead source integrations, WhatsApp/SMS/email usage, custom reports, data migration, and bespoke workflows.

Do not promise unlimited storage, custom work, third-party message costs, uptime guarantees, or statutory accounting compliance without a separate priced agreement. Price after estimating actual sales volume, users, storage, support expectations, and external API costs.

The first tenant is a design partner: protect the reusable core, but allow configuration such as branding, pipeline names, project types, documents, roles, and reports. Any GrahSiddhi-only behavior should be a configurable setting or a separately priced extension, not a fork of the platform.

---

## 18. Initial seed configuration for GrahSiddhi

Create one organization with:

```text
Organization: GrahSiddhi Construction
Timezone: Asia/Kolkata
Currency: INR
Theme: navy #1F2F3A, gold #C9A24A, off-white #F5F2EB
Font: Poppins
Plan: pilot/business (internal active subscription)
```

Seed stages: New, Contacted, Qualified, Site Visit Scheduled, Site Visit Completed, Negotiation, Booked, Lost.

Seed sources: Website, Walk-in, Referral, Instagram, Facebook, Google, Property Portal, Phone Inquiry, Other. These are configurable values, not product constants.

Seed permissions and roles before entering business data. Create at least one owner, one manager, and one sales executive test account to validate scopes.

---

## 19. Build order checklist

- [ ] Repository and environment setup complete
- [ ] Supabase schema migrations and RLS tests complete
- [ ] Auth, organization membership, and role permission layer complete
- [ ] GrahSiddhi branding configured as tenant settings
- [ ] Lead, activity, assignment, follow-up workflow complete
- [ ] Projects, towers, units, holds, and site visits complete
- [ ] Customer, booking, schedules, payments, documents complete
- [ ] Dashboard, reports, export, audit trail complete
- [ ] QA dataset, role test matrix, and cross-tenant test suite complete
- [ ] Backup/recovery plan verified for chosen production tier
- [ ] GrahSiddhi pilot training and feedback process complete
- [ ] Subscription and integration features remain schema-ready but disabled

---

## 20. Definition of V1 done

V1 is done when GrahSiddhi can securely sign in, configure its sales team, record and work leads, manage follow-ups and site visits, view available inventory, make a protected booking, track scheduled/received payments, attach documents, and review the operational dashboard/reports - with every action isolated to its organization and logged where it matters.

V1 is not done merely because the UI looks complete. It must pass the cross-tenant RLS tests, concurrent booking test, representative user acceptance testing, and a documented restore drill appropriate to the production plan.

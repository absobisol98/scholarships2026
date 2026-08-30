# Scholarship Portal

A full-stack scholarship application and management system for four roles:

- **Applicants** browse open scholarship programs, fill out a multi-step application (with
  server-side validation, a duplicate/eligibility check, and a capped retry limit), track
  status, upload a recommendation form, respond to check-in surveys once awarded, and view
  award letters. Sign-in is by email (with real signup) or "Continue with Google."
- **Paper Screeners** review applications assigned to them via screener groups, score them
  against a rubric, and submit a recommend / not-recommend verdict. Onboarded by an
  Admin/Super Admin via CSV import, with a password set directly or nominated through a
  one-time magic link; first login shows a Philippine Data Privacy Act (RA 10173) consent
  modal.
- **Program Admins** pick a workspace per program, manage cohorts and hard-filter eligibility
  criteria (with automatic red-flag tagging), review and promote/demote applicants, run
  bulk screener assignment, configure application fields, and deploy check-in surveys.
- **Super Admins** get everything a Program Admin gets across every program, plus Manage
  Users (create/deactivate Admin and Screener accounts, assign Admins to programs),
  Manage Programs (create programs, toggle which ones accept new applications), the Audit
  Log, and final-decision authority (award/waitlist/decline, red-flag override).

## Stack

Next.js 16 (App Router, Server Components + Server Actions) · TypeScript · Prisma + Postgres
(Supabase in production; a local Postgres instance works fine for development — see below) ·
plain CSS (no Tailwind) implementing a shared design-token system (`src/app/globals.css` +
`src/components/ui/`) with an indigo/purple accent palette, styled after an "Atlas CMS"
admin-dashboard reference: a grouped sidebar with a bottom profile card, a top-bar search,
numbered pagination, and kebab row-action menus on the admin/super-admin side; applicant and
screener pages share the same token/spacing/tag language without their own sidebar.

Real, persisted data throughout (programs, cohorts, criteria, applicants, staff accounts,
field configuration, surveys, audit log) — nothing is mock state. Authentication is real for
every role: applicants sign up or log in by email (or Google OAuth), screeners log in with a
password once one's been set, and every session is a signed, revocable cookie (logout,
password changes, and account deactivation all invalidate it immediately — see the security
section below).

## Run it

```bash
npm install
cp .env.example .env        # on Windows: copy .env.example .env
```

Fill in `.env` — see the comments in `.env.example` for exactly where each value comes from:

- `DATABASE_URL` / `DIRECT_URL` — a Postgres connection. Point these at a Supabase project's
  pooled/direct connection strings, or at a local Postgres instance (same value for both is
  fine locally: `postgresql://user:password@localhost:5432/scholarship_portal`).
- `SESSION_SECRET` — any random string, e.g.
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, only needed for "Continue with
  Google" on the applicant login page.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` — optional, only
  needed for certificate/video/recommendation-form uploads to actually store files.

Then:

```bash
npx prisma migrate deploy   # applies every committed migration in prisma/migrations/
npx prisma generate
npm run db:seed             # seeds programs, cohorts, staff accounts, applicants, surveys
npm run dev
```

Open http://localhost:3000. Each role has its own sign-in door — `/` (applicant), `/screener`,
`/admin`, `/super_admin` — with a "Log in as..." shortcut for the seeded demo persona on each,
or log in directly with any seeded email from `prisma/seed.ts`.

To reset to the original seeded state at any time: `npm run db:seed` (it clears and re-inserts).

## Security

The app has been through a full OWASP Top 10 pass — every Server Action requires the right
role, program-scoped records re-check the caller's actual access (not just a client-supplied
id), sessions are revocable (logout/password-change/deactivation all invalidate a cookie
immediately, not just on its own device), login is rate-limited per IP and per email, and CSV
exports are escaped against formula injection. See `src/lib/auth.ts`, `src/lib/session.ts`,
and `src/lib/rate-limit.ts` for the mechanisms if you're extending this.

## Notable decisions / simplifications

- **Two Postgres connection strings** (`DATABASE_URL` pooled, `DIRECT_URL` direct) because
  migrations need a real non-pooled connection while the running app wants a pooled one —
  see the comments in `.env.example`.
- **Screener passwords are the only real passwords in the app.** Every other role logs in by
  email match alone (plus Google OAuth for applicants) — there was never a requirement for
  password auth outside the screener-onboarding flow, and adding it everywhere would be
  scope with no real use case behind it.
- **Document uploads** (certificate, intro video, recommendation form) go to Supabase
  Storage via a service-role key server-side — never a direct browser-to-Supabase upload —
  and are served back through a route that mints a fresh, short-lived signed URL per request
  rather than baking one into server-rendered HTML.
- **No email-sending infrastructure.** A generated screener magic link is copy/paste — an
  Admin sends it manually. Same for anything else that would otherwise be an automated
  notification.

# Scholarship Portal

A full-stack implementation of the `Scholarship Portal.dc.html` design (Claude Design handoff in `../project`) — a scholarship application and management system for two roles:

- **Applicants** browse open scholarship programs, fill out a multi-step application, track status, and view award letters.
- **Program admins** pick a workspace per program, manage cohorts/hard-filter criteria (with automatic Red Flag tagging and a versioned change history), review and promote/demote applicants, configure application fields, and run twice-yearly check-in surveys.

## Stack

Next.js (App Router, Server Components + Server Actions) · TypeScript · Prisma + SQLite · plain CSS (no Tailwind) implementing the Modernist design system's tokens/components with the session's blue (`#0433FF`) / orange (`#FF7B00`) palette and Inter typeface.

Login is intentionally a no-credential demo ("Log in as applicant" / "Log in as program admin" / "Continue with Google" all just pick a role) — there is exactly one demo applicant persona (Amara Chen) and one demo admin persona (Dr. R. Okafor). Everything else — programs, cohorts, criteria, applicants, field configuration, surveys — is real, persisted data in SQLite via Prisma, not mock state.

## Run it

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db from prisma/schema.prisma
npm run db:seed          # seeds 3 programs, cohorts, applicants, fields, surveys
npm run dev
```

Then open http://localhost:3000.

To reset to the original seeded state at any time: `npm run db:seed` (it clears and re-inserts).

## Notable decisions / simplifications vs. the prototype

The `.dc.html` file is a Claude Design prototype (fake data, `{{ }}` template bindings, no backend) — this rebuilds it as a real app rather than porting its internal structure. A few deliberate departures:

- **Real routes**, not client-side screen state: `/browse`, `/programs/[key]/application|status|award`, `/admin/[key]/dashboard|cohorts|queue|fields|surveys`, etc. Back/forward and deep links work.
- **Application status** gained a `submitted` state (prototype only had `not_started` / `in_progress` / `awarded`) so "submitted, awaiting decision" reads correctly instead of offering "Continue application" on a locked, already-submitted form.
- **Checklist completion** is tracked per step as the applicant actually completes it, rather than the prototype's fixed demo defaults.
- **Uploaded files** (certificate, intro video) — only the filename is persisted; there's no file storage backend wired up.
- **Dashboard pipeline counts** ("Signed up 128", etc.) are program-level KPI fields, seeded like the prototype's, since they describe population-wide funnel volume that isn't tracked at per-applicant granularity anywhere else in the system.
- **Admin "Manage fields"** is — as in the prototype — a configuration surface only; it doesn't yet drive which fields the live application form renders.
- The admin's applicant roster (`Applicant`) is intentionally separate from the demo student's own `Application` rows, matching the prototype: they're two independent seeded datasets, not synced to each other.

# Implementation checklist

- [ ] Foundation: Next.js, strict TypeScript, Tailwind, validation, environment and runnable checks.
- [ ] Database: relational schema, tenant RLS, atomic RPCs, Storage policies and seed.
- [ ] Customer: table menu, scoped persistent cart, checkout and tracking.
- [ ] Staff: real Auth, explicit restaurant context, order workflow, payment and live recovery.
- [ ] Owner: menu, tables, QR, settings and memberships; platform onboarding.
- [ ] Reports: payment-time aggregation, timezone periods and safe CSV.
- [ ] Demo: two fictional restaurants and guided sales journey.
- [ ] Reliability: failed-request retention, retry keys, connectivity and accessibility.
- [ ] Verification: unit, browser, SQL isolation, lint, types and production build.
- [ ] Handover: provisioning, deployment, onboarding and release guidance.

Checks are marked complete only after implementation and verification. External database checks require a disposable Supabase project; never reset an existing database.

## Reversible decisions

SSP prices use two minor decimal digits, configurable per restaurant currency. No taxes or service charges in this MVP. Local demo uses server-side JSON persistence, isolated from Supabase and disabled in production. Images use Unsplash source URLs with textual fallbacks; confirm image rights and replace before commercial onboarding. Staff onboarding uses an administrator-created Supabase Auth user, then an owner-only membership operation; public registration is absent.

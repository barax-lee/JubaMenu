# JubaMenu

A digital menu and table-ordering platform in development for restaurants, lounges, cafes and hotels in Juba, South Sudan. One application is designed to serve multiple restaurants with separate menus, tables, staff and payment records.

## Current status

The public menu demonstration works locally. The complete ordering and staff-service journey is still under development; this is not a production-ready release.

Implemented:

- Public landing page with links to Freedom Lounge and Lee Bar.
- Individual restaurant menus with search, category filters, prices and sold-out labels.
- Responsive layouts, image fallbacks, photo fade-ins and continuous pan/zoom animations that respect reduced-motion preferences.
- Local demo data: two illustrative restaurants, three categories, twelve items and five tables per restaurant, plus sample orders and payments.
- Domain validation and server-side ordering, tracking, bill, payment and owner-management code.
- Supabase migration covering tenant relationships, RLS, transactional ordering, Storage policies and database-backed rate limiting.
- Owner-only image upload endpoint with file size, MIME type and signature checks.

Backend code and SQL still require live Supabase integration and security verification. The menu currently supports browsing, not cart checkout.

## Run locally

Use a current Node.js LTS release and npm.

```sh
npm ci
```

Create `.env.local` at the project root with:

```dotenv
JUBAMENU_DEMO=true
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

Then start the development server:

```sh
npm run dev
```

Open [JubaMenu](http://127.0.0.1:3000). On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

Use the same hostname configured in `NEXT_PUBLIC_APP_URL`; mutation endpoints enforce origin checks. Local demo mode stores JSON under `.demo/store.json`, is explicitly labeled, and is disabled when `NODE_ENV=production`. Supabase credentials are not required for local demo browsing. Local files and credentials are ignored by Git.

### Restaurant pages

- [Freedom Lounge](http://127.0.0.1:3000/r/freedom-lounge)
- [Lee Bar](http://127.0.0.1:3000/r/lee-bar)
- [Freedom Lounge, Table 1](http://127.0.0.1:3000/r/freedom-lounge/t/demo-freedom-lounge-table-1-qr)
- [Lee Bar, Table 1](http://127.0.0.1:3000/r/lee-bar/t/demo-lee-bar-table-1-qr)

Restaurant cards on the homepage open their respective menus. Table routes identify the table; checkout controls are not yet implemented. Demo prices are illustrative. The current demo uses SSP for Freedom Lounge and USD for Lee Bar.

## Environment variables

See [.env.example](.env.example) for the template.

| Variable | Purpose |
| --- | --- |
| `JUBAMENU_DEMO` | Enables local demo persistence when `true`; disabled in production. |
| `NEXT_PUBLIC_APP_URL` | Canonical application origin, including protocol and port. Use the deployed HTTPS origin in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for integrated mode. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public key for session-scoped access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key; never expose it to the browser or commit it. |
| `RATE_LIMIT_SECRET` | Server-only random secret of at least 32 characters for hashing rate-limit identities. |

## Supabase integration

1. Provision a fresh Supabase project and configure the environment variables above. Disable local demo mode for integrated development.
2. Apply [supabase/migrations/001_core.sql](supabase/migrations/001_core.sql) to the fresh project. It defines the schema, policies, RPCs, the `menu-images` bucket and the orders Realtime publication. Do not reset an existing database.
3. Create staff users through a trusted administrative process. Platform administrator bootstrapping, owner onboarding and their documentation remain unfinished.
4. Populate restaurant data separately. The TypeScript demo seed is used by local JSON mode; an automated Supabase seed loader is not implemented.
5. Verify tenant isolation, role permissions, uploads and order/payment transactions before deployment.

Image uploads require a real authenticated owner session and use restaurant-scoped Storage paths. Local demo mode rejects uploads. The deployment proxy must supply trustworthy client IP headers for rate limiting.

## Commands and verification

```sh
npm run dev        # Local development server
npm run typecheck  # TypeScript checking
npm run lint       # ESLint
npm test           # Vitest
npm run test:e2e   # Playwright
npm run build     # Production build
npm start         # Serve a completed production build
```

Latest development checks:

- TypeScript checking passed using `npx tsc --noEmit --incremental false`.
- ESLint passed with one existing anonymous-default-export warning in `postcss.config.mjs`.
- Both restaurant menu routes returned HTTP 200 in local demo mode.
- Vitest previously reported no test files. Automated unit, browser and database security suites are still to be written.
- Production build and live Supabase integration have not been verified.

## Project structure

```text
src/app/                 Public pages, styles and API routes
src/components/          Shared branding, food images and restaurant menus
src/lib/                 Domain rules, demo seed, data access and HTTP helpers
supabase/migrations/     Database schema, policies and functions
 docs/roadmap.md         Implementation checklist and product assumptions
```

## Remaining work

- Persistent, table-scoped cart, checkout, customer tracking page and bill-request interface.
- Staff login, logout, password reset, protected dashboards and live order updates.
- Owner screens for menu, table, settings and staff management.
- QR generation, downloads, printable table cards and token rotation confirmation.
- Sales report screens, date filtering and CSV downloads.
- Platform administration and secure restaurant onboarding.
- Connection recovery, failed-request handling and accessibility verification.
- Automated business-rule, tenant-isolation and browser tests.
- Production build verification and deployment, backup and handover documentation.
- Confirm permissions for demonstration photography before commercial use.

See [docs/roadmap.md](docs/roadmap.md) for the implementation checklist. Online payments, automated subscription billing, delivery, inventory and customer accounts are outside the current MVP scope.

# Ego Foods Direct Ordering System

Production-ready MVP for restaurant-owned direct ordering over WhatsApp. Customers order through WhatsApp, pay the restaurant directly using UPI, upload a payment screenshot, and the restaurant manages preparation status from a protected dashboard.

## Stack

- Next.js App Router, TypeScript, TailwindCSS, shadcn-style UI primitives
- Next.js Route Handlers for backend APIs
- Supabase PostgreSQL and Supabase Storage
- Meta WhatsApp Cloud API
- Zod validation, React Hook Form-ready forms, Recharts-ready reporting surface
- Vitest tests

## Core Features

- WhatsApp menu, cart, checkout, screenshot upload, tracking, repeat order, and graceful fallbacks.
- Dashboard cards, order table, CSV export, menu CRUD, customers CRM, reports, and restaurant settings.
- Manual UPI verification workflow without payment gateway or delivery integration.
- Secure dashboard password auth with httpOnly cookies.
- Rate limiting, input validation, file validation, webhook dedupe, audit logs, foreign keys, constraints, and indexes.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/dashboard`.

## Required Environment

See `.env.example`.

## Database

Migrations live in `supabase/migrations`. Seed data lives in `supabase/seed/seed.sql`.

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase db reset
```

## Deployment

Use Vercel for the app and Supabase for database/storage. Full steps are in `docs/DEPLOYMENT.md`.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

See `docs/TESTING.md` for webhook and dashboard QA.

## Internal Expert Review

- Product: Keeps direct-ordering scope focused; no payment gateway or delivery integration added.
- Frontend: Mobile-first dashboard with clear operational navigation and compact tables.
- Backend: Route handlers and repositories keep business logic isolated.
- Database: Foreign keys, constraints, indexes, and customer-stat refresh function are included.
- Security: Protected routes, httpOnly cookies, rate limiting, validation, storage limits, audit logs, and no frontend secrets.
- DevOps: Vercel and Supabase only; no VPS, Docker, or Kubernetes dependency.
- QA: Unit tests cover parser, rate limiting, and file validation; integration checklist covers WhatsApp and dashboard.
- Restaurant Operations: Statuses and manual screenshot verification match the intended workflow.

# نَبِيهَة (Nabiha) — Arabic-First Financial Intelligence Platform

## Overview

Arabic-first (RTL) financial intelligence platform. The mascot "نَبِيهَة" (meaning alert/aware) is a charming curly red-haired girl character who acts as the user's financial companion. Tagline: «درهمك بأمان مع نبيهة الزمان».

## Features

- **Auth (Clerk)**: Email/password + Google sign-in. Whitelabel keys via `publishableKeyFromHost`. Arabic UI with shadcn-styled appearance.
- **Onboarding**: 3-step wizard (welcome → financial profile → confirm). Sets monthly salary + currency. `OnboardingGate` fails closed on profile fetch errors.
- **Dashboard (لوحة التحكم)**: Monthly spending overview, priority/category breakdowns, monthly trend.
- **Expenses (المصاريف)**: 3 priority levels with category ownership validation server-side.
- **Commitments (الالتزامات)**: Recurring obligations by `dueDay` (1-31).
- **Subscriptions (الاشتراكات)**: Tracker with monthly equivalent calc + donut chart by category.
- **Calendar (التقويم)**: Month grid + timeline merging events + active subscription renewals + commitment due days.
- **Simulator (المحاكي)**: Borrowing capacity gauge (SVG) + projected balance area chart.
- **Notifications**: In-app notifications bell with unread count badge.
- **Profile**: Edit salary, currency, name.

## Currencies

JOD (default, د.أ), SAR, AED, KWD, BHD, OMR, QAR, EGP, USD, EUR. Helpers in `artifacts/nabiha/src/lib/currency.ts` (`CURRENCY_OPTIONS`, `formatAmount`, `getCurrency`).

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite + Wouter + TanStack Query + Clerk (`@clerk/react`) + Tailwind v4 + shadcn (artifacts/nabiha)
- **API**: Express 5 + `clerkMiddleware` + `requireAuth` (artifacts/api-server) — every route scoped to `req.userId`
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Codegen**: Orval (lib/api-spec → lib/api-client-react + lib/api-zod)
- **Charts**: Recharts + SVG

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema (dev only)

## API Routes (all require Clerk auth)

- `GET/PUT /api/profile`
- `GET/POST/PUT/DELETE /api/expenses[/:id]`
- `GET/POST/DELETE /api/categories[/:id]`
- `GET/POST/PUT/DELETE /api/commitments[/:id]`
- `GET/POST/PUT/DELETE /api/subscriptions[/:id]`
- `GET/POST/DELETE /api/events[/:id]`
- `GET/PATCH /api/notifications[/:id/read]`
- `POST /api/simulator`
- `GET /api/summary/{dashboard,priority-breakdown,category-breakdown,monthly-trend}`

## DB Schema (lib/db/src/schema)

All tables include `userId` (Clerk user id) and are scoped by it.

- `userProfiles` — `userId` PK, `monthlySalary`, `currency`, `displayName`, `onboardingComplete`
- `categories` — name, icon, color
- `expenses` — title, amount, priority, categoryId (validated against same user), date
- `commitments` — title, amount, dueDay (1-31), notes
- `subscriptions` — name, amount, currency, frequency (weekly/monthly/yearly), category, status (active/paused/cancelled), nextRenewalDate
- `events` — title, date, type (salary/bill/subscription/goal/reminder/expense), amount, notes
- `notifications` — title, body, type (info/warning/success/danger), isRead

## Security Notes

- All routes call `requireAuth` and filter by `req.userId`.
- Expense `categoryId` is validated to belong to the same user (POST/PUT) and joins enforce `categoryId AND categories.userId = userId` (no cross-tenant leakage).
- `OnboardingGate` fails closed: profile fetch errors show a retry UI rather than letting the user through.

## Cache Invalidation

Mutations invalidate both their own list query AND `getGetDashboardSummaryQueryKey()` so the dashboard always reflects fresh totals (Expenses, Commitments). Subscriptions also invalidate dashboard summary.

## Assets

Mascot images in `attached_assets/`:
- `j4skn9...` — logo/text icon
- `d3nzkdd...` — happy mascot with money flying (landing/dashboard hero)
- `7vmi4u...` — smiling mascot with coin purse
- `fn3x3w...` — serious mascot with coin purse

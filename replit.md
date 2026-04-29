# نَبِيهَة (Nabiha) — Financial Awareness App

## Overview

Arabic-first financial awareness and expense management web application. The mascot "نَبِيهَة" (meaning alert/aware) is a charming curly red-haired girl character who acts as the user's financial companion.

## Features

- **Auth (Clerk)**: Email/password + Gmail sign-in. Public landing at `/`, sign-in at `/sign-in`, protected app at `/app/*`.
- **Salary & Currency profile**: Set monthly salary, currency (17 Arab + USD/EUR/GBP, default JOD), and payday. Currencies JOD/KWD/BHD/OMR/LYD rendered with 3 decimals end-to-end.
- **Global currency switcher**: Header dropdown (`CurrencySwitcher`) lets users pick a display currency. All money in the app — dashboard cards, charts (axes + tooltips), expenses, commitments, subscriptions — converts on the fly via `CurrencyContext` (`format`, `convert`) using static FX rates in `src/lib/currency.ts`. Selection persists in `localStorage` (`nabiha:displayCurrency`, default `JOD`). Form input labels show the user's *base* (profile) currency symbol since amounts are stored in that currency. A static-FX disclaimer is shown in the popover.
- **Balance card**: Projected remaining = salary − monthly subscriptions − unpaid commitments − this month's expenses, with healthy/warning/critical states.
- **Subscriptions tracker**: Donut chart + add/delete (with confirmation) for monthly/yearly subscriptions, with renewal day.
- **Dashboard (لوحة التحكم)**: Monthly spending overview, priority breakdown charts, category distribution, monthly trend.
- **Expenses (المصاريف)**: Track expenses with 3 priority levels: ضرورية, مهمة, كمالية.
- **Commitments (الالتزامات)**: Personal obligations (rent, loans) with due dates and payment tracking.
- **Categories (الفئات)**: Custom expense categories with color coding.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/nabiha) — RTL Arabic, IBM Plex Sans Arabic font
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Routes

- `GET/POST /api/expenses` — expense CRUD
- `GET/PUT/DELETE /api/expenses/:id`
- `GET/POST /api/categories` — category management
- `DELETE /api/categories/:id`
- `GET/POST /api/commitments` — commitment management
- `PUT/DELETE /api/commitments/:id`
- `GET /api/summary/dashboard` — dashboard summary
- `GET /api/summary/priority-breakdown` — breakdown by priority
- `GET /api/summary/category-breakdown` — breakdown by category
- `GET /api/summary/monthly-trend` — 6-month trend
- `GET /api/summary/balance` — projected remaining balance (currency-aware)
- `GET/PUT /api/profile` — single-row user profile (salary, currency, payday)
- `GET/POST /api/subscriptions`, `PUT/DELETE /api/subscriptions/:id` — subscriptions CRUD

## DB Schema

- `categories` — expense categories (name, icon, color)
- `expenses` — individual expenses (title, amount, priority, categoryId, date)
- `commitments` — recurring financial obligations (title, amount, dueDay, isPaid)
- `user_profile` — single row id=1 (monthlySalary numeric(14,3), currency, payday)
- `subscriptions` — recurring digital subscriptions (name, amount numeric(14,3), billingCycle, color, renewsOnDay)

Note: data model is currently single-user (no per-user filtering). Per-user migration deferred.

## Assets

Mascot images in attached_assets/:
- d3nzkdd3... — happy mascot with money flying (used in dashboard header)
- fn3x3w... — serious mascot with coin purse
- 7vmi4u... — smiling mascot with coin purse
- j4skn9... — نَبِيهَة logo/text icon (used in sidebar)

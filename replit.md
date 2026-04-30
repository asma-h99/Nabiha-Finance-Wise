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
- **Commitments & Categories (الالتزامات والفئات)**: Unified page at `/app/commitments` with two tabs. Tab 1 manages personal obligations (rent, loans) with due dates, payment tracking, in-card edit dialog, and a back-to-dashboard button. Tab 2 manages custom expense categories with color coding. Sidebar links here as a single entry; legacy `/app/categories` redirects to this page. Card styling: `max-w-xs`, centered text, `p-4` padding, `h-8` icon buttons, theme-consistent emerald primary + amber accent.

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
- `GET/PUT /api/profile` — single-row user profile (salary, currency, payday, email notifications, name)
- `GET/POST /api/subscriptions`, `PUT/DELETE /api/subscriptions/:id` — subscriptions CRUD
- `POST /api/notifications/test` — send a sample reminder email immediately
- `POST /api/notifications/run` — manually trigger the reminder scheduler (also runs hourly in background)

## DB Schema

- `categories` — expense categories (name, icon, color)
- `expenses` — individual expenses (title, amount, priority, categoryId, date)
- `commitments` — recurring financial obligations (title, amount, dueDay, isPaid)
- `user_profile` — single row id=1 (monthlySalary numeric(14,3), currency, payday, emailNotificationsEnabled, notificationEmail, userName)
- `subscriptions` — recurring digital subscriptions (name, amount numeric(14,3), billingCycle, color, renewsOnDay)
- `sent_reminders` — dedupe ledger for outbound 48-hour reminders (commitmentId, dueDateKey YYYY-MM-DD, sentAt)

## Email reminders (Nabiha persona)

- Provider: Resend (uses `RESEND_API_KEY`; `RESEND_FROM_EMAIL` optional override).
- The api-server starts an in-process scheduler (`startReminderScheduler` in `lib/notifications.ts`) on boot that runs once after 30s and then hourly.
- For each commitment, it computes the next monthly due date and sends a friendly Arabic email if that date is exactly 2 days away and no reminder has been sent yet for that `(commitmentId, dueDateKey)`.
- Template lives in `artifacts/api-server/src/lib/email.ts` — RTL HTML, brand emerald palette, friendly Nabiha persona greeting using `userName`.
- UI: `artifacts/nabiha/src/components/NotificationsBell.tsx` — bell icon mounted in `App.tsx` headerExtra (visual left in RTL). Opens a dialog to toggle, set the recipient email & name, and send a test email.

Note: data model is currently single-user (no per-user filtering). Per-user migration deferred.

## Assets

Mascot images in attached_assets/:
- d3nzkdd3... — happy mascot with money flying (used in dashboard header)
- fn3x3w... — serious mascot with coin purse
- 7vmi4u... — smiling mascot with coin purse
- j4skn9... — نَبِيهَة logo/text icon (used in sidebar)

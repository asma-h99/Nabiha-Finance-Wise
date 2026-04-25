# نَبِيهَة (Nabiha) — Financial Awareness App

## Overview

Arabic-first financial awareness and expense management web application. The mascot "نَبِيهَة" (meaning alert/aware) is a charming curly red-haired girl character who acts as the user's financial companion.

## Features

- **Dashboard (لوحة التحكم)**: Monthly spending overview, priority breakdown charts, category distribution, monthly trend
- **Expenses (المصاريف)**: Track expenses with 3 priority levels: ضرورية (essential), مهمة (important), كمالية (luxury)
- **Commitments (الالتزامات)**: Personal financial obligations (rent, subscriptions, loans) with due dates and payment tracking
- **Categories (الفئات)**: Custom expense categories with color coding

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

## DB Schema

- `categories` — expense categories (name, icon, color)
- `expenses` — individual expenses (title, amount, priority, categoryId, date)
- `commitments` — recurring financial obligations (title, amount, dueDay, isPaid)

## Assets

Mascot images in attached_assets/:
- d3nzkdd3... — happy mascot with money flying (used in dashboard header)
- fn3x3w... — serious mascot with coin purse
- 7vmi4u... — smiling mascot with coin purse
- j4skn9... — نَبِيهَة logo/text icon (used in sidebar)

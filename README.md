# Passionate Teaching — Frontend

The web client for the Passionate Teaching Learning Management System.

Built with React + Vite + TypeScript + Tailwind + shadcn/ui, talking to a Supabase backend (Postgres + Auth + Storage + Realtime).

## Quickstart

```bash
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

App runs at http://localhost:5173.

## Stack

- **React 18** + **Vite 5** + **TypeScript 5**
- **Tailwind CSS 3** + **shadcn/ui** primitives
- **React Router v6** — routing
- **TanStack Query v5** — server state
- **react-hook-form** + **Zod** — forms
- **Recharts** — charts (admin stats, progress)
- **Supabase JS** — auth, db, storage, realtime
- **Lucide React** — icons
- **Sonner** — toasts

## Folder layout

```
src/
├─ components/   reusable UI (shadcn primitives + composed)
├─ features/     feature-scoped modules
├─ pages/        route-level pages
├─ lib/          supabase client, helpers, utils
├─ hooks/        custom hooks
├─ types/        shared types
└─ styles/       global CSS
```

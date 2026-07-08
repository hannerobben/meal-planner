# Meal Planner

A household meal planner PWA for two people.

## Stack
- Vue 3 + TypeScript + Vite 6
- PrimeVue 4 (Aura theme, green palette)
- Pinia (state management)
- Supabase (Postgres + Auth + RLS)
- SCSS (no Tailwind — custom utilities in style.scss)
- vite-plugin-pwa

## Commands
- `npm run dev` — start Vite dev server
- `npm run build` — type check + build for production
- `npm run preview` — preview production build
- `npm run supabase` — start local Supabase instance

## Key directories
- `src/pages/` — route-level components
- `src/components/` — reusable components, grouped by feature
- `src/stores/` — Pinia stores
- `src/supabase/` — Supabase client + API layer
- `src/model/` — TypeScript contracts
- `src/layouts/` — EmptyLayout (login) and DefaultLayout (main app)
- `src/primevue/` — PrimeVue plugin install + theme preset
- `supabase/migrations/` — ordered SQL migration files

## Base path
App is hosted at `/mealplanner/`. Vite base and Vue Router history base both use `/mealplanner/`.

## Auth
Supabase email/password. On first login, admin must set `household_id` in the `users` table.
All data is scoped to `household_id` via RLS policies.

## Env vars
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — public anon key

## CI/CD

Hosted on GitHub Pages at `https://<user>.github.io/mealplanner/`.

### Required GitHub Secrets
| Secret | Used by |
|--------|---------|
| `VITE_SUPABASE_URL` | deploy workflow — injected at build time |
| `VITE_SUPABASE_ANON_KEY` | deploy workflow — injected at build time |
| `SUPABASE_ACCESS_TOKEN` | migrate workflow — Supabase personal access token |
| `SUPABASE_PROJECT_ID` | migrate workflow — project ref from Supabase dashboard |
| `SUPABASE_DB_PASSWORD` | migrate workflow — DB password from Supabase dashboard |

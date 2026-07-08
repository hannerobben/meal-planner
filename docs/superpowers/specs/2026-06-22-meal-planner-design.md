# Meal Planner — Design Spec

**Date:** 2026-06-22  
**Status:** Approved

---

## Overview

A mobile-first PWA meal planner for a household of two. Users plan meals by day and meal type, save recipes with ingredients, derive a smart shopping list, and track nutrition (calories + macros). Both accounts share all data via a shared household. Hosted on GitHub Pages at `/mealplanner`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + TypeScript |
| Build | Vite 6 |
| UI components | PrimeVue 4 (Aura theme) |
| State | Pinia |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| Styles | SCSS (custom utilities, no Tailwind) |
| PWA | vite-plugin-pwa |
| Hosting | GitHub Pages (`/mealplanner` base path) |
| CI/CD | GitHub Actions (deploy + migrate) |

Mirrors the Fantacalcio project structure and conventions exactly.

---

## Architecture

### Layouts

- `EmptyLayout` — login page only
- `DefaultLayout` — main app shell with bottom 4-tab footer nav

### Pages

| Route | Page | Layout |
|-------|------|--------|
| `/login` | `LoginPage.vue` | Empty |
| `/plan` (default) | `PlanPage.vue` | Default |
| `/recipes` | `RecipesPage.vue` | Default |
| `/recipes/:id` | `RecipeDetailPage.vue` | Default |
| `/shopping` | `ShoppingPage.vue` | Default |
| `/profile` | `ProfilePage.vue` | Default |

### Footer Navigation

Four tabs: **Plan · Recipes · Shopping · Profile**

### Pinia Stores

| Store | Responsibility |
|-------|---------------|
| `auth.store.ts` | Supabase session, app user, household ID |
| `recipe.store.ts` | Recipe list, current recipe, ingredients CRUD |
| `plan.store.ts` | Meal plan entries for the visible week |
| `shopping.store.ts` | Aggregated ingredient list derived from plan entries |

### Supabase API Layer (`src/supabase/`)

- `supabase.ts` — client initialisation from env vars
- `auth.api.ts` — sign in, sign out, get user
- `recipe.api.ts` — CRUD for recipes and ingredients
- `plan.api.ts` — CRUD for meal plan entries
- `shopping.api.ts` — ranged query returning ingredients joined through plan entries

### Source Directory Layout

```
src/
├── pages/
│   ├── LoginPage.vue
│   ├── PlanPage.vue
│   ├── RecipesPage.vue
│   ├── RecipeDetailPage.vue
│   ├── ShoppingPage.vue
│   └── ProfilePage.vue
├── components/
│   ├── AppFooterMenu.vue
│   ├── plan/
│   │   ├── WeekGrid.vue
│   │   ├── DayColumn.vue
│   │   ├── MealSlot.vue
│   │   └── MealSlotDialog.vue
│   ├── recipe/
│   │   ├── RecipeCard.vue
│   │   ├── RecipeForm.vue
│   │   └── IngredientRow.vue
│   └── shopping/
│       ├── ShoppingCategory.vue
│       └── ShoppingItem.vue
├── stores/
│   ├── auth.store.ts
│   ├── recipe.store.ts
│   ├── plan.store.ts
│   └── shopping.store.ts
├── supabase/
│   ├── supabase.ts
│   ├── auth.api.ts
│   ├── recipe.api.ts
│   ├── plan.api.ts
│   └── shopping.api.ts
├── router/
│   └── route.ts
├── layouts/
│   ├── DefaultLayout.vue
│   └── EmptyLayout.vue
├── primevue/
│   ├── primevue.ts
│   └── primevue-preset.ts
├── model/
│   ├── recipe.contract.ts
│   ├── ingredient.contract.ts
│   ├── meal-plan-entry.contract.ts
│   └── user.contract.ts
├── App.vue
├── main.ts
├── style.scss
└── vite-env.d.ts
```

---

## Data Model

All tables use Row Level Security. Every authenticated user's `household_id` is resolved via `select household_id from users where id = auth.uid()`. All household-scoped tables enforce this as a policy on select, insert, update, and delete.

### `households`

```sql
create table households (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
```

### `users`

Extends `auth.users`. `household_id` is set by admin for MVP.

```sql
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid not null references households(id),
  display_name  text not null,
  created_at    timestamptz not null default now()
);
```

### `recipes`

```sql
create table recipes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id),
  name          text not null,
  notes         text,
  created_at    timestamptz not null default now()
);
```

### `ingredients`

Categories: `meat | dairy | frozen | fruit | vegetable | other`

```sql
create type ingredient_category as enum (
  'meat', 'dairy', 'frozen', 'fruit', 'vegetable', 'other'
);

create table ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  name        text not null,
  quantity    numeric not null,
  unit        text not null,
  category    ingredient_category not null,
  calories    numeric not null default 0,
  protein_g   numeric not null default 0,
  carbs_g     numeric not null default 0,
  fat_g       numeric not null default 0
);
```

### `meal_plan_entries`

Meal types: `breakfast | lunch | dinner | snack`

```sql
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table meal_plan_entries (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id),
  date          date not null,
  meal_type     meal_type not null,
  recipe_id     uuid references recipes(id) on delete set null,
  free_text     text,
  constraint recipe_or_text check (recipe_id is not null or free_text is not null)
);
```

### Notes on `ingredients` Table

`ingredients` has no direct RLS policy. It is always queried via a join through `recipes`, which is household-scoped. No client query addresses `ingredients` directly without going through a recipe context.

### RLS Policies (pattern, applied to all household-scoped tables)

```sql
-- Enable RLS
alter table <table> enable row level security;

-- Household policy
create policy "household access" on <table>
  for all using (
    household_id = (
      select household_id from users where id = auth.uid()
    )
  );
```

---

## Key Feature Flows

### Meal Planning

- `PlanPage` shows a 7-day grid (Mon–Sun of the current week by default)
- Each day column shows 4 slots: breakfast, lunch, dinner, snack
- Each slot displays the recipe name or free-text label, plus the slot's calorie contribution
- The day column header shows the summed daily calories from all recipe-backed slots
- Tapping an empty slot opens `MealSlotDialog` with two options: pick a recipe (searchable select) or type free text
- Tapping a filled slot opens the same dialog pre-filled for editing or clearing
- Week navigation: prev/next arrows update the displayed date range; `plan.store` fetches entries for the visible week

### Recipe Management

- `RecipesPage` shows all household recipes as cards, searchable by name
- Tapping a card navigates to `RecipeDetailPage`
- Detail page shows recipe name, notes, ingredient table, and computed nutrition totals (sum of all ingredients)
- Create and edit use `RecipeForm` — same component, mode determined by route param presence
- Ingredients are managed inline: add/remove rows, each row has name, quantity, unit, category, calories, protein, carbs, fat
- Deleting a recipe cascades to delete its ingredients; before deleting, the API layer updates every `meal_plan_entries` row that references this `recipe_id` — it sets `free_text = recipe.name` and `recipe_id = null` — so the slot retains a label but no longer pulls nutrition data

### Shopping List Derivation

- `ShoppingPage` defaults to the current Mon–Sun week
- A date range picker allows custom ranges
- On load / range change: `shopping.store` calls `shopping.api.ts` which queries `meal_plan_entries` for the range, joins `recipes` → `ingredients`
- Aggregation in the store: group by `(name, unit, category)`, sum `quantity`, `calories`, `protein_g`, `carbs_g`, `fat_g`
- Render: one `ShoppingCategory` section per category in this fixed order — fruit → vegetable → meat → dairy → frozen → other — each listing its `ShoppingItem` rows
- Each item has a checkbox (local ephemeral state in the store, resets on range change or page reload)

### Nutrition Tracking

- Per recipe: shown at the bottom of `RecipeDetailPage` — sum of all ingredient rows
- Per day: shown in each day column header on `PlanPage` — sum of calories from all recipe-backed slots for that day (free-text slots contribute 0)

---

## GitHub Actions

### Deploy to GitHub Pages (`.github/workflows/deploy.yml`)

- Trigger: push to `main`
- Steps:
  1. Checkout
  2. `npm ci`
  3. `npm run build` (env vars injected from GitHub Secrets)
  4. Deploy `dist/` to `gh-pages` branch via `peaceiris/actions-gh-pages`
- Vite base: `/mealplanner/`

**Required Secrets:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Run Supabase Migrations (`.github/workflows/migrate.yml`)

- Trigger: push to `main`
- Steps:
  1. Checkout
  2. Install Supabase CLI
  3. `supabase db push --project-ref $SUPABASE_PROJECT_ID`
- Migrations live in `supabase/migrations/`

**Required Secrets:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`

---

## Supabase Migrations

Migrations are numbered files in `supabase/migrations/`:

1. `..._create_types.sql` — `ingredient_category` and `meal_type` enums
2. `..._create_households.sql` — `households` table
3. `..._create_users.sql` — `users` table + RLS
4. `..._create_recipes.sql` — `recipes` table + RLS
5. `..._create_ingredients.sql` — `ingredients` table
6. `..._create_meal_plan_entries.sql` — `meal_plan_entries` table + RLS

---

## Environment Variables

| Variable | Used in | Source (dev) | Source (prod) |
|----------|---------|--------------|---------------|
| `VITE_SUPABASE_URL` | app | `.env.local` | GitHub Secret |
| `VITE_SUPABASE_ANON_KEY` | app | `.env.local` | GitHub Secret |
| `SUPABASE_ACCESS_TOKEN` | CI only | — | GitHub Secret |
| `SUPABASE_PROJECT_ID` | CI only | — | GitHub Secret |
| `SUPABASE_DB_PASSWORD` | CI only | — | GitHub Secret |

---

## PWA Manifest

```json
{
  "name": "Meal Planner",
  "short_name": "Meals",
  "theme_color": "#4CAF50",
  "icons": [
    { "src": "pwa-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "pwa-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "pwa-512x512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Out of Scope (MVP)

- In-app household invite flow (admin links accounts in Supabase)
- Recipe URL import / web scraping
- Meal plan templates or recurring meals
- Push notifications
- Offline write support (PWA caches reads only)

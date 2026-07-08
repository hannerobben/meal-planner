# Meal Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a full Vue 3 PWA meal planner app with PrimeVue, Pinia, Supabase auth + DB, and CI/CD via GitHub Actions to GitHub Pages.

**Architecture:** Plan-first single-page app with four bottom-tab sections (Plan, Recipes, Shopping, Profile). All data is scoped to a household shared between two users. The shopping list is derived at runtime from meal plan entries joined through recipes and ingredients; no materialized shopping table.

**Tech Stack:** Vue 3, TypeScript, Vite 6, PrimeVue 4 (Aura theme), Pinia, Supabase JS v2, vite-plugin-pwa, SCSS, GitHub Actions, GitHub Pages.

## Global Constraints

- Base path: `/mealplanner/` (Vite `base` config and Vue Router history base)
- No Tailwind — custom SCSS utilities only (mirror `style.scss` pattern from Fantacalcio)
- Dark mode disabled (`darkModeSelector: false` in PrimeVue config)
- TypeScript strict mode, `noUnusedLocals`, `noUnusedParameters` — build fails on violations
- Tab width 4, single quotes, semicolons, print width 100 (`.prettierrc.json`)
- Never commit actual secret values — `.env.local` holds local dev secrets and is gitignored
- Ingredient categories (exact strings): `meat`, `dairy`, `frozen`, `fruit`, `vegetable`, `other`
- Meal types (exact strings): `breakfast`, `lunch`, `dinner`, `snack`
- Shopping category display order: fruit → vegetable → meat → dairy → frozen → other
- All DB tables use Row Level Security scoped to `household_id`
- No git commits — user manages git

---

## File Map

```
meal-planner/
├── .github/
│   └── workflows/
│       ├── deploy.yml                        # GitHub Pages deployment
│       └── migrate.yml                       # Supabase migration runner
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260622000001_create_types.sql
│       ├── 20260622000002_create_households.sql
│       ├── 20260622000003_create_users.sql
│       ├── 20260622000004_create_recipes.sql
│       ├── 20260622000005_create_ingredients.sql
│       └── 20260622000006_create_meal_plan_entries.sql
├── public/
│   ├── pwa-192x192.png                       # placeholder — replace before shipping
│   ├── pwa-512x512.png
│   └── pwa-512x512-maskable.png
├── src/
│   ├── model/
│   │   ├── user.contract.ts                  # AppUserContract interface
│   │   ├── recipe.contract.ts                # RecipeContract interface
│   │   ├── ingredient.contract.ts            # IngredientContract + IngredientCategory type
│   │   └── meal-plan-entry.contract.ts       # MealPlanEntryContract + MealType type
│   ├── supabase/
│   │   ├── supabase.ts                       # createClient from env vars
│   │   ├── useAuth.ts                        # signUp/signIn/signOut composable
│   │   ├── auth.api.ts                       # getAuthUser, getAppUser static class
│   │   ├── recipe.api.ts                     # CRUD for recipes + ingredients
│   │   ├── plan.api.ts                       # CRUD for meal_plan_entries
│   │   └── shopping.api.ts                   # ranged ingredient query
│   ├── stores/
│   │   ├── auth.store.ts                     # authUser, appUser, householdId
│   │   ├── recipe.store.ts                   # recipes list, current recipe
│   │   ├── plan.store.ts                     # entries for visible week
│   │   └── shopping.store.ts                 # aggregated + categorized ingredient list
│   ├── router/
│   │   └── route.ts                          # routes + auth guard
│   ├── layouts/
│   │   ├── EmptyLayout.vue                   # login only
│   │   └── DefaultLayout.vue                 # main app shell + footer nav
│   ├── primevue/
│   │   ├── primevue-preset.ts                # green Aura theme preset
│   │   └── primevue.ts                       # plugin install + global component registration
│   ├── components/
│   │   ├── AppTabMenu.vue                    # reusable tab menu with router integration
│   │   ├── AppFooterMenu.vue                 # bottom nav (Plan/Recipes/Shopping/Profile)
│   │   ├── plan/
│   │   │   ├── WeekGrid.vue                  # 7-column layout container
│   │   │   ├── DayColumn.vue                 # single day with 4 slots + calorie total
│   │   │   ├── MealSlot.vue                  # single breakfast/lunch/dinner/snack cell
│   │   │   └── MealSlotDialog.vue            # dialog: pick recipe or type free text
│   │   ├── recipe/
│   │   │   ├── RecipeCard.vue                # card shown in recipe list
│   │   │   ├── RecipeForm.vue                # create/edit form (name, notes, ingredients)
│   │   │   └── IngredientRow.vue             # single ingredient input row
│   │   └── shopping/
│   │       ├── ShoppingCategory.vue          # category group header + item list
│   │       └── ShoppingItem.vue              # single ingredient row with checkbox
│   ├── pages/
│   │   ├── LoginPage.vue
│   │   ├── PlanPage.vue
│   │   ├── RecipesPage.vue
│   │   ├── RecipeDetailPage.vue
│   │   ├── ShoppingPage.vue
│   │   └── ProfilePage.vue
│   ├── App.vue
│   ├── main.ts
│   ├── size.ts                               # ScreenSizeUtil (viewport height fix)
│   ├── style.scss
│   └── vite-env.d.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .prettierrc.json
├── .gitignore
├── .env.local                                # gitignored — local Supabase creds
└── CLAUDE.md
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `.prettierrc.json`
- Create: `.gitignore`
- Create: `.env.local`
- Create: `src/vite-env.d.ts`
- Create: `src/size.ts`
- Create: `CLAUDE.md`

**Interfaces:**
- Produces: runnable Vite dev server; `npm run build` passes

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "meal-planner",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "supabase": "supabase start"
  },
  "dependencies": {
    "@primeuix/themes": "^1.2.3",
    "@primevue/themes": "^4.5.3",
    "@supabase/supabase-js": "^2.54.0",
    "dayjs": "^1.11.13",
    "pinia": "^3.0.3",
    "primeicons": "^7.0.0",
    "primevue": "^4.3.7",
    "vite-svg-loader": "^5.1.0",
    "vue": "^3.5.18",
    "vue-router": "^4.5.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.5",
    "@vue/tsconfig": "^0.7.0",
    "sass": "^1.97.3",
    "supabase": "^2.67.1",
    "typescript": "~5.8.3",
    "vite": "^6.4.1",
    "vite-plugin-pwa": "^1.2.0",
    "vue-tsc": "^2.1.6"
  },
  "overrides": {
    "serialize-javascript": ">=7.0.5"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import svgLoader from 'vite-svg-loader';

export default defineConfig({
    base: '/mealplanner/',
    plugins: [
        vue(),
        svgLoader(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
            manifest: {
                name: 'Meal Planner',
                short_name: 'Meals',
                description: 'Household meal planner',
                theme_color: '#2E7D32',
                icons: [
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    {
                        src: 'pwa-512x512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            src: fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "composite": true,
    "resolveJsonModule": true,
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: Create `tsconfig.app.json`**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": false,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/pwa-192x192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meal Planner</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `.prettierrc.json`**

```json
{
    "$schema": "https://json.schemastore.org/prettierrc",
    "semi": true,
    "tabWidth": 4,
    "singleQuote": true,
    "printWidth": 100,
    "trailingComma": "none"
}
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules
dist
.env.local
.env.*.local
*.local
.DS_Store
.vercel
```

- [ ] **Step 9: Create `.env.local`** (local Supabase — fill in after `supabase start`)

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start output>
```

- [ ] **Step 10: Create `src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 11: Create `src/size.ts`**

```typescript
export class ScreenSizeUtil {
    public static setViewportHeight() {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
    }

    public static watchViewPortChange(): void {
        new ResizeObserver(() => {
            ScreenSizeUtil.setViewportHeight();
        }).observe(document.documentElement);
    }
}
```

- [ ] **Step 12: Create `CLAUDE.md`**

```markdown
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
```

- [ ] **Step 13: Create placeholder PWA icon files**

Create three empty placeholder PNG files so Vite doesn't fail at build time. Replace with real icons before shipping.

```bash
mkdir -p public
# create minimal 1x1 transparent PNGs as placeholders
python3 -c "
import base64, pathlib
# minimal valid 1x1 transparent PNG (67 bytes)
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
for name in ['pwa-192x192.png','pwa-512x512.png','pwa-512x512-maskable.png']:
    pathlib.Path('public/' + name).write_bytes(png)
print('done')
"
```

- [ ] **Step 14: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 15: Create minimal `src/App.vue` to unblock build**

```vue
<script setup lang="ts">
</script>

<template>
    <div>loading</div>
</template>
```

- [ ] **Step 16: Create minimal `src/main.ts` to unblock build**

```typescript
import { createApp } from 'vue';
import './style.scss';
import App from './App.vue';

createApp(App).mount('#app');
```

- [ ] **Step 17: Create `src/style.scss`** (stub — will be replaced in Task 4)

```scss
:root {
    font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
}

body {
    margin: 0;
}
```

- [ ] **Step 18: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors, `dist/` created.

---

### Task 2: Supabase migrations

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260622000001_create_types.sql`
- Create: `supabase/migrations/20260622000002_create_households.sql`
- Create: `supabase/migrations/20260622000003_create_users.sql`
- Create: `supabase/migrations/20260622000004_create_recipes.sql`
- Create: `supabase/migrations/20260622000005_create_ingredients.sql`
- Create: `supabase/migrations/20260622000006_create_meal_plan_entries.sql`

**Interfaces:**
- Produces: local Supabase DB with all tables, types, and RLS policies

- [ ] **Step 1: Create `supabase/config.toml`**

```toml
project_id = "meal-planner"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[api.tls]
enabled = false

[db]
port = 54322
shadow_port = 54320
major_version = 17

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[realtime]
enabled = true

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"
openai_api_key = "env(OPENAI_API_KEY)"

[inbucket]
enabled = true
port = 54324

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true
enable_anonymous_sign_ins = false
enable_manual_linking = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[auth.sms]
enable_signup = false
enable_confirmations = false
```

- [ ] **Step 2: Create `supabase/migrations/20260622000001_create_types.sql`**

```sql
create type public.ingredient_category as enum (
    'meat',
    'dairy',
    'frozen',
    'fruit',
    'vegetable',
    'other'
);

create type public.meal_type as enum (
    'breakfast',
    'lunch',
    'dinner',
    'snack'
);
```

- [ ] **Step 3: Create `supabase/migrations/20260622000002_create_households.sql`**

```sql
create table public.households (
    id         uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

alter table public.households enable row level security;

create policy "authenticated users can read their own household"
    on public.households
    for select
    using (
        id = (select household_id from public.users where id = auth.uid())
    );
```

- [ ] **Step 4: Create `supabase/migrations/20260622000003_create_users.sql`**

```sql
create table public.users (
    id            uuid primary key references auth.users(id) on delete cascade,
    household_id  uuid not null references public.households(id),
    display_name  text not null,
    created_at    timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users can read own household members"
    on public.users
    for select
    using (
        household_id = (select household_id from public.users where id = auth.uid())
    );

create policy "users can update own record"
    on public.users
    for update
    using (id = auth.uid());
```

- [ ] **Step 5: Create `supabase/migrations/20260622000004_create_recipes.sql`**

```sql
create table public.recipes (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id),
    name          text not null,
    notes         text,
    created_at    timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "household recipe access"
    on public.recipes
    for all
    using (
        household_id = (select household_id from public.users where id = auth.uid())
    )
    with check (
        household_id = (select household_id from public.users where id = auth.uid())
    );
```

- [ ] **Step 6: Create `supabase/migrations/20260622000005_create_ingredients.sql`**

```sql
create table public.ingredients (
    id          uuid primary key default gen_random_uuid(),
    recipe_id   uuid not null references public.recipes(id) on delete cascade,
    name        text not null,
    quantity    numeric not null,
    unit        text not null,
    category    public.ingredient_category not null,
    calories    numeric not null default 0,
    protein_g   numeric not null default 0,
    carbs_g     numeric not null default 0,
    fat_g       numeric not null default 0
);
```

Note: `ingredients` has no direct RLS — it is always accessed through `recipes` which are household-scoped. No client query targets `ingredients` without a recipe context.

- [ ] **Step 7: Create `supabase/migrations/20260622000006_create_meal_plan_entries.sql`**

```sql
create table public.meal_plan_entries (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id),
    date          date not null,
    meal_type     public.meal_type not null,
    recipe_id     uuid references public.recipes(id) on delete set null,
    free_text     text,
    constraint recipe_or_text check (recipe_id is not null or free_text is not null)
);

alter table public.meal_plan_entries enable row level security;

create policy "household meal plan access"
    on public.meal_plan_entries
    for all
    using (
        household_id = (select household_id from public.users where id = auth.uid())
    )
    with check (
        household_id = (select household_id from public.users where id = auth.uid())
    );
```

- [ ] **Step 8: Start local Supabase and verify migrations run**

```bash
supabase start
supabase db reset
```

Expected: all 6 migration files run without errors. Tables visible in Supabase Studio at `http://localhost:54323`.

- [ ] **Step 9: Copy the anon key from `supabase start` output into `.env.local`**

The output shows `anon key: eyJ...`. Paste it as `VITE_SUPABASE_ANON_KEY` in `.env.local`.

---

### Task 3: GitHub Actions

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `.github/workflows/migrate.yml`

**Interfaces:**
- Produces: CI/CD pipelines that deploy to GitHub Pages and run Supabase migrations on push to `main`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
```

- [ ] **Step 2: Create `.github/workflows/migrate.yml`**

```yaml
name: Run Supabase Migrations

on:
  push:
    branches:
      - main

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Run migrations
        run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

- [ ] **Step 3: Verify YAML syntax**

```bash
npx js-yaml .github/workflows/deploy.yml
npx js-yaml .github/workflows/migrate.yml
```

Expected: each prints the parsed object with no errors.

- [ ] **Step 4: Document required GitHub Secrets**

Add this to `CLAUDE.md` under a new `## CI/CD` heading:

```markdown
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
```

---

### Task 4: Global styles, PrimeVue, and app shell

**Files:**
- Create: `src/style.scss` (replaces stub)
- Create: `src/primevue/primevue-preset.ts`
- Create: `src/primevue/primevue.ts`
- Modify: `src/main.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Produces: PrimeVue components available globally; green theme active; `Toast` renders in App root

- [ ] **Step 1: Replace `src/style.scss` with full styles**

```scss
:root {
    font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    background-color: whitesmoke;
}

:root {
    --p-primary-color: #2E7D32 !important;
    --p-primary-600: #1B5E20 !important;
    --p-primary-500: #2E7D32 !important;
    --p-primary-400: #388E3C !important;
    --p-primary-300: #43A047 !important;

    --p-tabmenu-item-active-color: #2E7D32 !important;
    --p-tabmenu-item-active-border-color: #2E7D32 !important;

    --p-card-body-padding: 12px !important;
}

.p-dialog-content { height: 100% }

.p-tabmenu-item-link {
    padding: 8px 12px 4px 12px !important;
}

.p-toast {
    top: 20px !important;
    right: 3% !important;
    max-width: 94% !important;
}

.svg {
    height: 16px;
    width: 16px;
}

body {
    margin: 0;
    max-width: 100vw;
    height: 100vh;
    height: 100dvh;
    height: var(--vh);

    #app {
        height: 100%;
    }
}

.flex-col {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.footer {
    border-top: 1px solid #dee2e6;
}

.p-tabmenu-tablist {
    justify-content: center;
}

.p-toolbar {
    border: none !important;
    border-bottom: 1px solid #dee2e6 !important;
    border-radius: 0 !important;
}

.title {
    margin-bottom: 24px;
    font-weight: bold;
    width: 100%;
}

.p-tabmenu-item-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px !important;

    .label {
        font-size: 0.6em;
    }
}

.card {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0px 3px 6px 0px rgb(0 0 0 / 39%);
}

.p-drawer {
    background: rgba(255, 255, 255, 0.94) !important;
    border-color: #d6d6d6 !important;
}

.flex {
    display: flex;

    &.col {
        flex-direction: column;
    }

    &.justify-end {
        justify-content: flex-end;
    }

    &.gap-4 {
        gap: 4px;
    }

    &.gap-8 {
        gap: 8px;
    }

    &.items-center {
        align-items: center;
    }
}
```

- [ ] **Step 2: Create `src/primevue/primevue-preset.ts`**

```typescript
import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

export const primevuePreset = definePreset(Aura, {
    primitive: {
        green: {
            50: '#F1F8E9',
            100: '#DCEDC8',
            200: '#C5E1A5',
            300: '#AED581',
            400: '#2E7D32',
            500: '#1B5E20',
            600: '#174D1A',
            700: '#133B14',
            800: '#0F2A0F',
            900: '#0A1A0A'
        },
        gray: {
            50: '#F7F7F7',
            100: '#EEEEEE',
            200: '#D5D5D5',
            300: '#BEBEBE',
            400: '#9E9E9E',
            500: '#7E7E7E',
            600: '#5F5F5F',
            700: '#424242',
            800: '#2E2E2E',
            900: '#1C1C1C'
        }
    },
    semantic: {
        colorScheme: {
            light: {
                primary: {
                    color: '{green.400}',
                    50: '{green.50}',
                    100: '{green.100}',
                    200: '{green.200}',
                    300: '{green.300}',
                    400: '{green.400}',
                    500: '{green.500}',
                    600: '{green.600}',
                    700: '{green.700}',
                    800: '{green.800}',
                    900: '{green.900}',
                    hover: { color: '{green.500}' },
                    active: { color: '{green.500}' }
                }
            },
            dark: {}
        }
    }
});
```

- [ ] **Step 3: Create `src/primevue/primevue.ts`**

```typescript
import { type Plugin } from 'vue';
import PrimeVue from 'primevue/config';
import Ripple from 'primevue/ripple';
import { Card, Checkbox, DatePicker, DialogService, Drawer, ToastService, ToggleSwitch, Tooltip } from 'primevue';
import { primevuePreset } from './primevue-preset.ts';
import Button from 'primevue/button';
import TabMenu from 'primevue/tabmenu';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import Divider from 'primevue/divider';
import Fieldset from 'primevue/fieldset';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Textarea from 'primevue/textarea';

export const primevuePlugin: Plugin = {
    install(app) {
        app.directive('ripple', Ripple);
        app.directive('tooltip', Tooltip);

        app.use(ToastService);
        app.use(DialogService);

        app.use(PrimeVue, {
            ripple: true,
            theme: {
                preset: primevuePreset,
                options: {
                    darkModeSelector: false
                }
            }
        });

        app.component('Button', Button);
        app.component('TabMenu', TabMenu);
        app.component('InputText', InputText);
        app.component('InputNumber', InputNumber);
        app.component('Select', Select);
        app.component('Tag', Tag);
        app.component('Toolbar', Toolbar);
        app.component('Dialog', Dialog);
        app.component('Toast', Toast);
        app.component('Card', Card);
        app.component('Drawer', Drawer);
        app.component('DatePicker', DatePicker);
        app.component('ToggleSwitch', ToggleSwitch);
        app.component('Checkbox', Checkbox);
        app.component('Fieldset', Fieldset);
        app.component('Divider', Divider);
        app.component('IconField', IconField);
        app.component('InputIcon', InputIcon);
        app.component('Textarea', Textarea);
    }
};
```

- [ ] **Step 4: Replace `src/main.ts`**

```typescript
import { createApp } from 'vue';
import './style.scss';
import 'primeicons/primeicons.css';
import App from './App.vue';
import router from './router/route.ts';
import { ScreenSizeUtil } from './size.ts';
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth.store.ts';
import { primevuePlugin } from './primevue/primevue.ts';

(async () => {
    const app = createApp(App);

    app.use(router);

    const pinia = createPinia();
    app.use(pinia);

    app.use(primevuePlugin);

    const authStore = useAuthStore();
    await authStore.getAuthUser().then(async () => {
        await authStore.getAppUser();
    });

    app.mount('#app');

    ScreenSizeUtil.setViewportHeight();
    ScreenSizeUtil.watchViewPortChange();
})();
```

- [ ] **Step 5: Replace `src/App.vue`**

```vue
<script setup lang="ts">
import { useRoute } from 'vue-router';
import DefaultLayout from './layouts/DefaultLayout.vue';
</script>

<template>
    <Toast />
    <component
        :is="useRoute().meta.layout ?? DefaultLayout"
        v-bind="useRoute().meta.layoutProps ?? {}"
    />
</template>

<style scoped></style>
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: no errors. Note: `main.ts` imports `router` and `auth.store` which don't exist yet — create them as stubs before running build.

Stub for `src/router/route.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router';
const router = createRouter({ history: createWebHistory('/mealplanner/'), routes: [] });
export default router;
```

Stub for `src/stores/auth.store.ts`:
```typescript
import { defineStore } from 'pinia';
export const useAuthStore = defineStore('auth-store', {
    state: () => ({ authUser: null as null | object, appUser: undefined as undefined | object }),
    actions: {
        async getAuthUser() {},
        async getAppUser() {}
    }
});
```

---

### Task 5: Layouts, router, and navigation shell

**Files:**
- Create: `src/layouts/EmptyLayout.vue`
- Create: `src/layouts/DefaultLayout.vue`
- Create: `src/components/AppTabMenu.vue`
- Create: `src/components/AppFooterMenu.vue`
- Create stub pages: `src/pages/LoginPage.vue`, `src/pages/PlanPage.vue`, `src/pages/RecipesPage.vue`, `src/pages/ShoppingPage.vue`, `src/pages/ProfilePage.vue`
- Replace: `src/router/route.ts`

**Interfaces:**
- Produces: navigable app with 4-tab bottom nav; auth guard redirects to login when no session

- [ ] **Step 1: Create `src/layouts/EmptyLayout.vue`**

```vue
<script setup lang="ts"></script>

<template>
    <div class="full-page">
        <slot>
            <RouterView />
        </slot>
    </div>
</template>

<style scoped>
.full-page {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
```

- [ ] **Step 2: Create `src/layouts/DefaultLayout.vue`**

```vue
<script setup lang="ts">
import AppFooterMenu from '../components/AppFooterMenu.vue';
</script>

<template>
    <div class="full-page">
        <div class="page-container custom-scrollbar">
            <div class="page-content">
                <RouterView />
            </div>
        </div>
        <AppFooterMenu />
    </div>
</template>

<style scoped>
.full-page {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.page-container {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow-y: auto;

    .page-content {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background-color: whitesmoke;
    }
}
</style>
```

- [ ] **Step 3: Create `src/components/AppTabMenu.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps<{
    items: { label?: string; route: { name: string }; icon?: string }[];
}>();

const route = useRoute();
const activeIndex = ref(0);

watch(
    () => route.name,
    (newPath) => {
        const foundIndex = props.items.findIndex((item) => item.route.name === newPath);
        activeIndex.value = foundIndex !== -1 ? foundIndex : 0;
    },
    { immediate: true }
);
</script>

<template>
    <TabMenu :model="items" :activeIndex="activeIndex">
        <template #item="{ item, props: itemProps }">
            <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                <a :href="href" v-bind="itemProps.action" @click="navigate">
                    <div :class="item.icon" style="font-size: 1.2rem" />
                    <div class="label" v-if="item.label">{{ item.label }}</div>
                </a>
            </RouterLink>
        </template>
    </TabMenu>
</template>

<style scoped></style>
```

- [ ] **Step 4: Create `src/components/AppFooterMenu.vue`**

```vue
<script setup lang="ts">
import AppTabMenu from './AppTabMenu.vue';

const items = [
    { label: 'Plan', route: { name: 'Plan' }, icon: 'pi pi-fw pi-calendar' },
    { label: 'Recipes', route: { name: 'Recipes' }, icon: 'pi pi-fw pi-book' },
    { label: 'Shopping', route: { name: 'Shopping' }, icon: 'pi pi-fw pi-shopping-cart' },
    { label: 'Profile', route: { name: 'Profile' }, icon: 'pi pi-fw pi-user' }
];
</script>

<template>
    <div class="footer">
        <AppTabMenu :items="items" />
    </div>
</template>

<style scoped></style>
```

- [ ] **Step 5: Create stub page components**

Create each of the following with identical structure — just change the page name in the `<h2>`:

`src/pages/LoginPage.vue`:
```vue
<script setup lang="ts"></script>
<template><div style="padding: 20px"><h2>Login</h2></div></template>
```

`src/pages/PlanPage.vue`:
```vue
<script setup lang="ts"></script>
<template><div style="padding: 20px"><h2>Plan</h2></div></template>
```

`src/pages/RecipesPage.vue`:
```vue
<script setup lang="ts"></script>
<template><div style="padding: 20px"><h2>Recipes</h2></div></template>
```

`src/pages/RecipeDetailPage.vue`:
```vue
<script setup lang="ts"></script>
<template><div style="padding: 20px"><h2>Recipe Detail</h2></div></template>
```

`src/pages/ShoppingPage.vue`:
```vue
<script setup lang="ts"></script>
<template><div style="padding: 20px"><h2>Shopping</h2></div></template>
```

`src/pages/ProfilePage.vue`:
```vue
<script setup lang="ts"></script>
<template><div style="padding: 20px"><h2>Profile</h2></div></template>
```

- [ ] **Step 6: Replace `src/router/route.ts`**

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import PlanPage from '../pages/PlanPage.vue';
import RecipesPage from '../pages/RecipesPage.vue';
import RecipeDetailPage from '../pages/RecipeDetailPage.vue';
import ShoppingPage from '../pages/ShoppingPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import DefaultLayout from '../layouts/DefaultLayout.vue';
import EmptyLayout from '../layouts/EmptyLayout.vue';
import { useAuthStore } from '../stores/auth.store.ts';

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
        meta: { layout: EmptyLayout }
    },
    {
        path: '/',
        meta: { requiresAuth: true, layout: DefaultLayout },
        redirect: { name: 'Plan' },
        children: [
            { path: 'plan', name: 'Plan', component: PlanPage },
            { path: 'recipes', name: 'Recipes', component: RecipesPage },
            { path: 'recipes/:id', name: 'RecipeDetail', component: RecipeDetailPage },
            { path: 'shopping', name: 'Shopping', component: ShoppingPage },
            { path: 'profile', name: 'Profile', component: ProfilePage }
        ]
    }
];

const router = createRouter({
    history: createWebHistory('/mealplanner/'),
    routes
});

router.beforeEach(async (to, _from, next) => {
    await useAuthStore().getAuthUser();
    const user = useAuthStore().authUser;

    if (to.meta.requiresAuth && !user) {
        next({ name: 'Login' });
    } else if (to.name === 'Login' && user) {
        next({ name: 'Plan' });
    } else {
        next();
    }
});

export default router;
```

- [ ] **Step 7: Verify build and dev server**

```bash
npm run build
npm run dev
```

Expected: build passes. Dev server starts. Navigate to `http://localhost:5173/mealplanner/` — see "Plan" stub page with bottom 4-tab nav. Clicking each tab navigates correctly.

---

### Task 6: TypeScript contracts

**Files:**
- Create: `src/model/user.contract.ts`
- Create: `src/model/recipe.contract.ts`
- Create: `src/model/ingredient.contract.ts`
- Create: `src/model/meal-plan-entry.contract.ts`

**Interfaces:**
- Produces: all shared types used by stores, APIs, and components in Tasks 7–10

- [ ] **Step 1: Create `src/model/user.contract.ts`**

```typescript
export interface AppUserContract {
    id: string;
    household_id: string;
    display_name: string;
    created_at: string;
}
```

- [ ] **Step 2: Create `src/model/ingredient.contract.ts`**

```typescript
export type IngredientCategory = 'meat' | 'dairy' | 'frozen' | 'fruit' | 'vegetable' | 'other';

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
    'fruit',
    'vegetable',
    'meat',
    'dairy',
    'frozen',
    'other'
];

export interface IngredientContract {
    id: string;
    recipe_id: string;
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}
```

- [ ] **Step 3: Create `src/model/recipe.contract.ts`**

```typescript
import type { IngredientContract } from './ingredient.contract.ts';

export interface RecipeContract {
    id: string;
    household_id: string;
    name: string;
    notes: string | null;
    created_at: string;
    ingredients?: IngredientContract[];
}
```

- [ ] **Step 4: Create `src/model/meal-plan-entry.contract.ts`**

```typescript
import type { RecipeContract } from './recipe.contract.ts';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealPlanEntryContract {
    id: string;
    household_id: string;
    date: string;
    meal_type: MealType;
    recipe_id: string | null;
    free_text: string | null;
    recipe?: RecipeContract;
}
```

- [ ] **Step 5: Verify types compile**

```bash
npm run build
```

Expected: no TypeScript errors.

---

### Task 7: Auth — Supabase client, API, store, login page, profile page

**Files:**
- Create: `src/supabase/supabase.ts`
- Create: `src/supabase/useAuth.ts`
- Create: `src/supabase/auth.api.ts`
- Replace: `src/stores/auth.store.ts`
- Replace: `src/pages/LoginPage.vue`
- Replace: `src/pages/ProfilePage.vue`

**Interfaces:**
- Consumes: `AppUserContract` from `src/model/user.contract.ts`
- Produces: `useAuthStore()` with `authUser`, `appUser`, `householdId` reactive state; login/logout working end-to-end

- [ ] **Step 1: Create `src/supabase/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Create `src/supabase/useAuth.ts`**

```typescript
import { ref, onMounted } from 'vue';
import { supabase } from './supabase.ts';
import type { AuthError, User } from '@supabase/supabase-js';

export function useAuth() {
    const user = ref<User | null>(null);
    const loading = ref(true);
    const error = ref<AuthError | null>(null);

    onMounted(async () => {
        await supabase.auth.getSession().then(({ data }) => {
            user.value = data.session?.user || null;
            loading.value = false;
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user || null;
        });
    });

    async function signIn(email: string, password: string) {
        loading.value = true;
        error.value = null;
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        error.value = err;
        loading.value = false;
        return data;
    }

    async function signOut() {
        await supabase.auth.signOut();
        user.value = null;
    }

    return { user, loading, error, signIn, signOut };
}
```

- [ ] **Step 3: Create `src/supabase/auth.api.ts`**

```typescript
import { supabase } from './supabase.ts';
import type { AppUserContract } from '../model/user.contract.ts';
import type { User } from '@supabase/supabase-js';

export class AuthApi {
    public static async getAuthUser(): Promise<User | null> {
        const { data } = await supabase.auth.getSession();
        return data.session?.user || null;
    }

    public static async getAppUser(authUserId: string): Promise<AppUserContract | undefined> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .single();

        if (error) return undefined;
        return data ?? undefined;
    }

    public static async updateDisplayName(userId: string, displayName: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ display_name: displayName })
            .eq('id', userId);

        if (error) throw error;
    }
}
```

- [ ] **Step 4: Replace `src/stores/auth.store.ts`**

```typescript
import { defineStore } from 'pinia';
import type { AppUserContract } from '../model/user.contract.ts';
import type { User } from '@supabase/supabase-js';
import { AuthApi } from '../supabase/auth.api.ts';

export const useAuthStore = defineStore('auth-store', {
    state: (): {
        authUser: User | null;
        appUser: AppUserContract | undefined;
    } => ({ authUser: null, appUser: undefined }),
    getters: {
        householdId: (state): string | undefined => state.appUser?.household_id
    },
    actions: {
        async getAuthUser() {
            this.authUser = await AuthApi.getAuthUser();
        },
        async getAppUser() {
            if (!this.authUser) return;
            this.appUser = await AuthApi.getAppUser(this.authUser.id);
        },
        async getAuthUserAndAppUser() {
            await this.getAuthUser();
            await this.getAppUser();
        },
        async clearUsers() {
            this.authUser = null;
            this.appUser = undefined;
        }
    }
});
```

- [ ] **Step 5: Replace `src/pages/LoginPage.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../supabase/useAuth.ts';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth.store.ts';

const authStore = useAuthStore();
const { authUser } = storeToRefs(authStore);

const { signIn, error: authError, loading } = useAuth();
const router = useRouter();

const email = ref('');
const password = ref('');

async function signInHandler() {
    await signIn(email.value, password.value);
    await authStore.getAuthUserAndAppUser();
    if (authUser.value) {
        router.push({ name: 'Plan' });
    }
}
</script>

<template>
    <div class="wrapper">
        <div>
            <i class="pi pi-apple" style="font-size: 4rem; color: #2E7D32" />
        </div>
        <h1 style="margin: 0">Meal Planner</h1>
        <div class="login-form">
            <InputText v-model="email" placeholder="Email" type="email" />
            <InputText type="password" v-model="password" placeholder="Password" />
            <Button @click="signInHandler" :loading="loading" label="Sign In" />
            <p v-if="authError" class="error">{{ authError.message }}</p>
        </div>
    </div>
</template>

<style scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 20px;

    .login-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 300px;
    }

    .error {
        text-align: center;
        color: red;
        margin: 0;
    }
}
</style>
```

- [ ] **Step 6: Replace `src/pages/ProfilePage.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth.store.ts';
import { useAuth } from '../supabase/useAuth.ts';
import { AuthApi } from '../supabase/auth.api.ts';

const authStore = useAuthStore();
const { authUser, appUser } = storeToRefs(authStore);
const { signOut } = useAuth();
const router = useRouter();

const editingName = ref(false);
const nameInput = ref(appUser.value?.display_name ?? '');

async function saveName() {
    if (!authUser.value || !nameInput.value.trim()) return;
    await AuthApi.updateDisplayName(authUser.value.id, nameInput.value.trim());
    await authStore.getAppUser();
    editingName.value = false;
}

async function handleSignOut() {
    await signOut();
    authStore.clearUsers();
    router.push({ name: 'Login' });
}
</script>

<template>
    <div class="profile-page">
        <h2 class="title">Profile</h2>

        <div class="field">
            <label>Email</label>
            <p>{{ authUser?.email }}</p>
        </div>

        <div class="field">
            <label>Display name</label>
            <div v-if="!editingName" class="name-row">
                <p>{{ appUser?.display_name }}</p>
                <Button icon="pi pi-pencil" text @click="editingName = true" />
            </div>
            <div v-else class="name-row">
                <InputText v-model="nameInput" />
                <Button icon="pi pi-check" @click="saveName" />
                <Button icon="pi pi-times" text severity="secondary" @click="editingName = false" />
            </div>
        </div>

        <Button label="Sign out" severity="danger" outlined @click="handleSignOut" class="signout" />
    </div>
</template>

<style scoped>
.profile-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.field label {
    font-size: 0.8em;
    color: #666;
    display: block;
    margin-bottom: 4px;
}

.field p {
    margin: 0;
}

.name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.signout {
    margin-top: 24px;
    width: fit-content;
}
</style>
```

- [ ] **Step 7: Manual verification**

Start `supabase start` and `npm run dev`. Navigate to `http://localhost:5173/mealplanner/`.

Expected:
- App redirects to `/mealplanner/login`
- Login form renders with email + password fields and Sign In button
- Sign in with a Supabase test user — redirected to Plan page with bottom nav visible
- Profile tab shows email; sign out button returns to login

---

### Task 8: Recipe feature

**Files:**
- Create: `src/supabase/recipe.api.ts`
- Create: `src/stores/recipe.store.ts`
- Create: `src/components/recipe/IngredientRow.vue`
- Create: `src/components/recipe/RecipeForm.vue`
- Create: `src/components/recipe/RecipeCard.vue`
- Replace: `src/pages/RecipesPage.vue`
- Replace: `src/pages/RecipeDetailPage.vue`

**Interfaces:**
- Consumes: `RecipeContract`, `IngredientContract`, `IngredientCategory`, `INGREDIENT_CATEGORIES` from model contracts; `householdId` getter from `useAuthStore()`
- Produces: `useRecipeStore()` with `recipes`, `currentRecipe`; `RecipeApi` with `getAll`, `getById`, `create`, `update`, `remove`, `upsertIngredients`

- [ ] **Step 1: Create `src/supabase/recipe.api.ts`**

```typescript
import { supabase } from './supabase.ts';
import type { RecipeContract } from '../model/recipe.contract.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';

export class RecipeApi {
    public static async getAll(householdId: string): Promise<RecipeContract[]> {
        const { data, error } = await supabase
            .from('recipes')
            .select('*, ingredients(*)')
            .eq('household_id', householdId)
            .order('name');

        if (error) throw error;
        return data ?? [];
    }

    public static async getById(id: string): Promise<RecipeContract | undefined> {
        const { data, error } = await supabase
            .from('recipes')
            .select('*, ingredients(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ?? undefined;
    }

    public static async create(
        householdId: string,
        name: string,
        notes: string | null
    ): Promise<RecipeContract> {
        const { data, error } = await supabase
            .from('recipes')
            .insert({ household_id: householdId, name, notes })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    public static async update(
        id: string,
        name: string,
        notes: string | null
    ): Promise<void> {
        const { error } = await supabase
            .from('recipes')
            .update({ name, notes })
            .eq('id', id);

        if (error) throw error;
    }

    public static async remove(id: string): Promise<void> {
        await supabase
            .from('meal_plan_entries')
            .select('id, recipe_id')
            .eq('recipe_id', id)
            .then(async ({ data }) => {
                if (!data?.length) return;
                const { data: recipe } = await supabase
                    .from('recipes')
                    .select('name')
                    .eq('id', id)
                    .single();
                const recipeName = recipe?.name ?? 'Deleted recipe';
                await Promise.all(
                    data.map((entry) =>
                        supabase
                            .from('meal_plan_entries')
                            .update({ recipe_id: null, free_text: recipeName })
                            .eq('id', entry.id)
                    )
                );
            });

        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw error;
    }

    public static async upsertIngredients(
        recipeId: string,
        ingredients: Omit<IngredientContract, 'id' | 'recipe_id'>[]
    ): Promise<void> {
        await supabase.from('ingredients').delete().eq('recipe_id', recipeId);

        if (!ingredients.length) return;

        const rows = ingredients.map((i) => ({ ...i, recipe_id: recipeId }));
        const { error } = await supabase.from('ingredients').insert(rows);
        if (error) throw error;
    }
}
```

- [ ] **Step 2: Create `src/stores/recipe.store.ts`**

```typescript
import { defineStore } from 'pinia';
import type { RecipeContract } from '../model/recipe.contract.ts';
import { RecipeApi } from '../supabase/recipe.api.ts';
import { useAuthStore } from './auth.store.ts';

export const useRecipeStore = defineStore('recipe-store', {
    state: (): {
        recipes: RecipeContract[];
        currentRecipe: RecipeContract | undefined;
        loading: boolean;
    } => ({ recipes: [], currentRecipe: undefined, loading: false }),
    actions: {
        async fetchAll() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            this.recipes = await RecipeApi.getAll(householdId);
            this.loading = false;
        },
        async fetchById(id: string) {
            this.loading = true;
            this.currentRecipe = await RecipeApi.getById(id);
            this.loading = false;
        },
        async removeRecipe(id: string) {
            await RecipeApi.remove(id);
            this.recipes = this.recipes.filter((r) => r.id !== id);
        }
    }
});
```

- [ ] **Step 3: Create `src/components/recipe/IngredientRow.vue`**

```vue
<script setup lang="ts">
import type { IngredientCategory } from '../../model/ingredient.contract.ts';
import { INGREDIENT_CATEGORIES } from '../../model/ingredient.contract.ts';

export interface IngredientRowData {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

const props = defineProps<{ modelValue: IngredientRowData }>();
const emit = defineEmits<{
    'update:modelValue': [value: IngredientRowData];
    remove: [];
}>();

function update(field: keyof IngredientRowData, value: unknown) {
    emit('update:modelValue', { ...props.modelValue, [field]: value });
}

const categoryOptions = INGREDIENT_CATEGORIES.map((c) => ({ label: c, value: c }));
</script>

<template>
    <div class="ingredient-row">
        <InputText
            :modelValue="modelValue.name"
            @update:modelValue="update('name', $event)"
            placeholder="Name"
            class="name-field"
        />
        <InputNumber
            :modelValue="modelValue.quantity"
            @update:modelValue="update('quantity', $event ?? 0)"
            placeholder="Qty"
            :min="0"
            class="num-field"
        />
        <InputText
            :modelValue="modelValue.unit"
            @update:modelValue="update('unit', $event)"
            placeholder="Unit"
            class="unit-field"
        />
        <Select
            :modelValue="modelValue.category"
            @update:modelValue="update('category', $event)"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Category"
            class="cat-field"
        />
        <InputNumber
            :modelValue="modelValue.calories"
            @update:modelValue="update('calories', $event ?? 0)"
            placeholder="kcal"
            :min="0"
            class="num-field"
        />
        <InputNumber
            :modelValue="modelValue.protein_g"
            @update:modelValue="update('protein_g', $event ?? 0)"
            placeholder="P(g)"
            :min="0"
            class="num-field"
        />
        <InputNumber
            :modelValue="modelValue.carbs_g"
            @update:modelValue="update('carbs_g', $event ?? 0)"
            placeholder="C(g)"
            :min="0"
            class="num-field"
        />
        <InputNumber
            :modelValue="modelValue.fat_g"
            @update:modelValue="update('fat_g', $event ?? 0)"
            placeholder="F(g)"
            :min="0"
            class="num-field"
        />
        <Button icon="pi pi-trash" text severity="danger" @click="emit('remove')" />
    </div>
</template>

<style scoped>
.ingredient-row {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}

.name-field { flex: 2; min-width: 100px; }
.unit-field { flex: 1; min-width: 60px; }
.cat-field  { flex: 1; min-width: 100px; }
.num-field  { flex: 1; min-width: 70px; }
</style>
```

- [ ] **Step 4: Create `src/components/recipe/RecipeForm.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.ts';
import { RecipeApi } from '../../supabase/recipe.api.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import IngredientRow from './IngredientRow.vue';
import type { IngredientRowData } from './IngredientRow.vue';
import type { IngredientCategory } from '../../model/ingredient.contract.ts';

const props = defineProps<{ recipe?: RecipeContract }>();

const router = useRouter();
const authStore = useAuthStore();

const name = ref(props.recipe?.name ?? '');
const notes = ref(props.recipe?.notes ?? '');
const saving = ref(false);

function blankRow(): IngredientRowData {
    return { name: '', quantity: 0, unit: 'g', category: 'other' as IngredientCategory, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

const ingredients = ref<IngredientRowData[]>(
    props.recipe?.ingredients?.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        calories: i.calories,
        protein_g: i.protein_g,
        carbs_g: i.carbs_g,
        fat_g: i.fat_g
    })) ?? []
);

function addIngredient() {
    ingredients.value.push(blankRow());
}

function removeIngredient(index: number) {
    ingredients.value.splice(index, 1);
}

const totals = computed(() => ({
    calories: ingredients.value.reduce((s, i) => s + (i.calories || 0), 0),
    protein_g: ingredients.value.reduce((s, i) => s + (i.protein_g || 0), 0),
    carbs_g: ingredients.value.reduce((s, i) => s + (i.carbs_g || 0), 0),
    fat_g: ingredients.value.reduce((s, i) => s + (i.fat_g || 0), 0)
}));

async function save() {
    if (!name.value.trim()) return;
    saving.value = true;
    try {
        let recipeId: string;
        if (props.recipe) {
            await RecipeApi.update(props.recipe.id, name.value.trim(), notes.value || null);
            recipeId = props.recipe.id;
        } else {
            const created = await RecipeApi.create(
                authStore.householdId!,
                name.value.trim(),
                notes.value || null
            );
            recipeId = created.id;
        }
        await RecipeApi.upsertIngredients(recipeId, ingredients.value);
        router.push({ name: 'Recipes' });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="recipe-form">
        <div class="field">
            <label>Name *</label>
            <InputText v-model="name" placeholder="Recipe name" />
        </div>

        <div class="field">
            <label>Notes</label>
            <Textarea v-model="notes" placeholder="Instructions, tips…" rows="3" autoResize />
        </div>

        <div class="ingredients-section">
            <div class="ingredients-header">
                <h3>Ingredients</h3>
                <Button icon="pi pi-plus" label="Add" text @click="addIngredient" />
            </div>

            <div class="ingredient-labels">
                <span class="lbl-name">Name</span>
                <span class="lbl-qty">Qty</span>
                <span class="lbl-unit">Unit</span>
                <span class="lbl-cat">Category</span>
                <span class="lbl-num">kcal</span>
                <span class="lbl-num">P(g)</span>
                <span class="lbl-num">C(g)</span>
                <span class="lbl-num">F(g)</span>
            </div>

            <IngredientRow
                v-for="(ing, idx) in ingredients"
                :key="idx"
                v-model="ingredients[idx]"
                @remove="removeIngredient(idx)"
            />

            <div v-if="ingredients.length" class="totals">
                <strong>Totals:</strong>
                {{ totals.calories }}kcal &nbsp;|&nbsp;
                P: {{ totals.protein_g }}g &nbsp;|&nbsp;
                C: {{ totals.carbs_g }}g &nbsp;|&nbsp;
                F: {{ totals.fat_g }}g
            </div>
        </div>

        <div class="actions">
            <Button label="Cancel" text severity="secondary" @click="router.back()" />
            <Button label="Save" :loading="saving" @click="save" />
        </div>
    </div>
</template>

<style scoped>
.recipe-form {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label { font-size: 0.85em; color: #555; }
}

.ingredients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 { margin: 0; }
}

.ingredient-labels {
    display: flex;
    gap: 6px;
    font-size: 0.75em;
    color: #888;
    padding: 0 2px;
}
.lbl-name { flex: 2; min-width: 100px; }
.lbl-qty, .lbl-unit, .lbl-num { flex: 1; min-width: 60px; }
.lbl-cat { flex: 1; min-width: 100px; }

.totals {
    margin-top: 12px;
    font-size: 0.9em;
    color: #333;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>
```

- [ ] **Step 5: Create `src/components/recipe/RecipeCard.vue`**

```vue
<script setup lang="ts">
import type { RecipeContract } from '../../model/recipe.contract.ts';
import { computed } from 'vue';

const props = defineProps<{ recipe: RecipeContract }>();
const emit = defineEmits<{ select: []; remove: [] }>();

const totalCalories = computed(() =>
    (props.recipe.ingredients ?? []).reduce((s, i) => s + i.calories, 0)
);
</script>

<template>
    <div class="recipe-card card" @click="emit('select')">
        <div class="card-body">
            <div class="card-title">{{ recipe.name }}</div>
            <div class="card-meta">
                {{ recipe.ingredients?.length ?? 0 }} ingredients &nbsp;·&nbsp; {{ totalCalories }} kcal
            </div>
        </div>
        <Button
            icon="pi pi-trash"
            text
            severity="danger"
            @click.stop="emit('remove')"
        />
    </div>
</template>

<style scoped>
.recipe-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    cursor: pointer;
    background: white;

    &:hover { background: #f9f9f9; }
}

.card-title { font-weight: 600; }
.card-meta { font-size: 0.8em; color: #666; margin-top: 2px; }
</style>
```

- [ ] **Step 6: Replace `src/pages/RecipesPage.vue`**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRecipeStore } from '../stores/recipe.store.ts';
import RecipeCard from '../components/recipe/RecipeCard.vue';

const router = useRouter();
const recipeStore = useRecipeStore();
const { recipes, loading } = storeToRefs(recipeStore);

const search = ref('');

const filtered = computed(() =>
    recipes.value.filter((r) =>
        r.name.toLowerCase().includes(search.value.toLowerCase())
    )
);

onMounted(() => recipeStore.fetchAll());

async function handleRemove(id: string) {
    if (!confirm('Delete this recipe?')) return;
    await recipeStore.removeRecipe(id);
}
</script>

<template>
    <div class="recipes-page">
        <div class="header">
            <h2 class="title" style="margin-bottom: 0">Recipes</h2>
            <Button icon="pi pi-plus" label="New" @click="router.push({ name: 'RecipeDetail', params: { id: 'new' } })" />
        </div>

        <IconField>
            <InputIcon class="pi pi-search" />
            <InputText v-model="search" placeholder="Search recipes…" />
        </IconField>

        <div v-if="loading" class="loading">Loading…</div>
        <div v-else-if="!filtered.length" class="empty">No recipes yet. Tap + to create one.</div>
        <div v-else class="recipe-list">
            <RecipeCard
                v-for="recipe in filtered"
                :key="recipe.id"
                :recipe="recipe"
                @select="router.push({ name: 'RecipeDetail', params: { id: recipe.id } })"
                @remove="handleRemove(recipe.id)"
            />
        </div>
    </div>
</template>

<style scoped>
.recipes-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.recipe-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.loading, .empty {
    text-align: center;
    color: #888;
    padding: 40px 0;
}
</style>
```

- [ ] **Step 7: Replace `src/pages/RecipeDetailPage.vue`**

```vue
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRecipeStore } from '../stores/recipe.store.ts';
import RecipeForm from '../components/recipe/RecipeForm.vue';

const route = useRoute();
const recipeStore = useRecipeStore();
const { currentRecipe, loading } = storeToRefs(recipeStore);

const isNew = computed(() => route.params.id === 'new');

onMounted(async () => {
    if (!isNew.value) {
        await recipeStore.fetchById(route.params.id as string);
    } else {
        recipeStore.currentRecipe = undefined;
    }
});
</script>

<template>
    <div>
        <div v-if="loading" style="padding: 20px">Loading…</div>
        <RecipeForm v-else :recipe="isNew ? undefined : currentRecipe" />
    </div>
</template>
```

- [ ] **Step 8: Manual verification**

With local Supabase running:
- Sign in, navigate to Recipes tab
- Tap + New → recipe form opens
- Add recipe name, notes, and 2 ingredients with all fields filled
- Tap Save → redirected to Recipes list, new recipe card visible
- Tap card → edit form opens pre-filled
- Check totals row updates as you edit ingredient values
- Delete recipe → card disappears

---

### Task 9: Meal plan feature

**Files:**
- Create: `src/supabase/plan.api.ts`
- Create: `src/stores/plan.store.ts`
- Create: `src/components/plan/MealSlot.vue`
- Create: `src/components/plan/MealSlotDialog.vue`
- Create: `src/components/plan/DayColumn.vue`
- Create: `src/components/plan/WeekGrid.vue`
- Replace: `src/pages/PlanPage.vue`

**Interfaces:**
- Consumes: `MealPlanEntryContract`, `MealType`, `MEAL_TYPES` from `meal-plan-entry.contract.ts`; `RecipeContract` from `recipe.contract.ts`; `householdId` from `useAuthStore()`; `recipes` from `useRecipeStore()`
- Produces: `usePlanStore()` with `entries`, `weekStart`; `PlanApi` with `getForRange`, `upsert`, `remove`

- [ ] **Step 1: Create `src/supabase/plan.api.ts`**

```typescript
import { supabase } from './supabase.ts';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';

export class PlanApi {
    public static async getForRange(
        householdId: string,
        from: string,
        to: string
    ): Promise<MealPlanEntryContract[]> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select('*, recipe:recipes(*, ingredients(*))')
            .eq('household_id', householdId)
            .gte('date', from)
            .lte('date', to);

        if (error) throw error;
        return data ?? [];
    }

    public static async upsert(
        householdId: string,
        date: string,
        mealType: MealType,
        recipeId: string | null,
        freeText: string | null
    ): Promise<MealPlanEntryContract> {
        const { data: existing } = await supabase
            .from('meal_plan_entries')
            .select('id')
            .eq('household_id', householdId)
            .eq('date', date)
            .eq('meal_type', mealType)
            .single();

        if (existing) {
            const { data, error } = await supabase
                .from('meal_plan_entries')
                .update({ recipe_id: recipeId, free_text: freeText })
                .eq('id', existing.id)
                .select('*, recipe:recipes(*, ingredients(*))')
                .single();
            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('meal_plan_entries')
            .insert({ household_id: householdId, date, meal_type: mealType, recipe_id: recipeId, free_text: freeText })
            .select('*, recipe:recipes(*, ingredients(*))')
            .single();
        if (error) throw error;
        return data;
    }

    public static async remove(id: string): Promise<void> {
        const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id);
        if (error) throw error;
    }
}
```

- [ ] **Step 2: Create `src/stores/plan.store.ts`**

```typescript
import { defineStore } from 'pinia';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';
import { PlanApi } from '../supabase/plan.api.ts';
import { useAuthStore } from './auth.store.ts';
import dayjs from 'dayjs';

function toIso(d: dayjs.Dayjs) {
    return d.format('YYYY-MM-DD');
}

export const usePlanStore = defineStore('plan-store', {
    state: (): {
        entries: MealPlanEntryContract[];
        weekStart: string;
        loading: boolean;
    } => ({
        entries: [],
        weekStart: toIso(dayjs().startOf('week').add(1, 'day')),
        loading: false
    }),
    getters: {
        weekEnd: (state): string =>
            toIso(dayjs(state.weekStart).add(6, 'day')),
        entryFor: (state) => (date: string, mealType: MealType): MealPlanEntryContract | undefined =>
            state.entries.find((e) => e.date === date && e.meal_type === mealType)
    },
    actions: {
        async fetchWeek() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            this.entries = await PlanApi.getForRange(householdId, this.weekStart, this.weekEnd);
            this.loading = false;
        },
        prevWeek() {
            this.weekStart = toIso(dayjs(this.weekStart).subtract(7, 'day'));
            this.fetchWeek();
        },
        nextWeek() {
            this.weekStart = toIso(dayjs(this.weekStart).add(7, 'day'));
            this.fetchWeek();
        },
        async upsertEntry(
            date: string,
            mealType: MealType,
            recipeId: string | null,
            freeText: string | null
        ) {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            const updated = await PlanApi.upsert(householdId, date, mealType, recipeId, freeText);
            const idx = this.entries.findIndex(
                (e) => e.date === date && e.meal_type === mealType
            );
            if (idx >= 0) {
                this.entries[idx] = updated;
            } else {
                this.entries.push(updated);
            }
        },
        async removeEntry(id: string) {
            await PlanApi.remove(id);
            this.entries = this.entries.filter((e) => e.id !== id);
        }
    }
});
```

- [ ] **Step 3: Create `src/components/plan/MealSlot.vue`**

```vue
<script setup lang="ts">
import type { MealPlanEntryContract } from '../../model/meal-plan-entry.contract.ts';

defineProps<{
    entry: MealPlanEntryContract | undefined;
    mealType: string;
}>();

defineEmits<{ click: [] }>();
</script>

<template>
    <div class="meal-slot" :class="{ filled: !!entry }" @click="$emit('click')">
        <span class="meal-label">{{ mealType }}</span>
        <span v-if="entry" class="meal-name">
            {{ entry.recipe?.name ?? entry.free_text }}
        </span>
        <span v-else class="empty-hint">+ Add</span>
    </div>
</template>

<style scoped>
.meal-slot {
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px dashed #ccc;
    cursor: pointer;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    gap: 2px;

    &.filled {
        border-style: solid;
        border-color: #2E7D32;
        background: #f1f8e9;
    }
}

.meal-label {
    font-size: 0.65em;
    text-transform: uppercase;
    color: #888;
    font-weight: 600;
}

.meal-name {
    font-size: 0.85em;
    color: #222;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.empty-hint {
    font-size: 0.75em;
    color: #bbb;
}
</style>
```

- [ ] **Step 4: Create `src/components/plan/MealSlotDialog.vue`**

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';

const props = defineProps<{
    visible: boolean;
    entry: MealPlanEntryContract | undefined;
    date: string;
    mealType: MealType;
    recipes: RecipeContract[];
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    save: [recipeId: string | null, freeText: string | null];
    remove: [];
}>();

const mode = ref<'recipe' | 'text'>('recipe');
const selectedRecipeId = ref<string | null>(null);
const freeText = ref('');

watch(
    () => props.visible,
    (v) => {
        if (!v) return;
        if (props.entry?.recipe_id) {
            mode.value = 'recipe';
            selectedRecipeId.value = props.entry.recipe_id;
            freeText.value = '';
        } else if (props.entry?.free_text) {
            mode.value = 'text';
            freeText.value = props.entry.free_text;
            selectedRecipeId.value = null;
        } else {
            mode.value = 'recipe';
            selectedRecipeId.value = null;
            freeText.value = '';
        }
    }
);

const recipeOptions = computed(() =>
    props.recipes.map((r) => ({ label: r.name, value: r.id }))
);

const canSave = computed(() =>
    mode.value === 'recipe' ? !!selectedRecipeId.value : !!freeText.value.trim()
);

function handleSave() {
    if (mode.value === 'recipe') {
        emit('save', selectedRecipeId.value, null);
    } else {
        emit('save', null, freeText.value.trim());
    }
    emit('update:visible', false);
}

const title = computed(() => {
    const dayName = new Date(props.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    return `${props.mealType.charAt(0).toUpperCase() + props.mealType.slice(1)} — ${dayName}`;
});
</script>

<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :header="title" modal style="width: 340px">
        <div class="dialog-body">
            <div class="mode-toggle">
                <Button
                    label="From recipe"
                    :outlined="mode !== 'recipe'"
                    @click="mode = 'recipe'"
                    size="small"
                />
                <Button
                    label="Free text"
                    :outlined="mode !== 'text'"
                    @click="mode = 'text'"
                    size="small"
                />
            </div>

            <Select
                v-if="mode === 'recipe'"
                v-model="selectedRecipeId"
                :options="recipeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose a recipe…"
                filter
                style="width: 100%"
            />

            <InputText
                v-else
                v-model="freeText"
                placeholder="e.g. Leftovers, takeaway…"
                style="width: 100%"
            />
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button
                    v-if="entry"
                    label="Clear slot"
                    text
                    severity="danger"
                    @click="emit('remove'); emit('update:visible', false)"
                />
                <div style="flex: 1" />
                <Button label="Cancel" text severity="secondary" @click="$emit('update:visible', false)" />
                <Button label="Save" :disabled="!canSave" @click="handleSave" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 0 8px;
}

.mode-toggle {
    display: flex;
    gap: 8px;
}

.dialog-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}
</style>
```

- [ ] **Step 5: Create `src/components/plan/DayColumn.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import { MEAL_TYPES } from '../../model/meal-plan-entry.contract.ts';
import MealSlot from './MealSlot.vue';

const props = defineProps<{
    date: string;
    entries: MealPlanEntryContract[];
}>();

const emit = defineEmits<{ slotClick: [date: string, mealType: MealType] }>();

const dayLabel = computed(() => {
    const d = new Date(props.date + 'T00:00:00');
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.getDate() };
});

const dailyCalories = computed(() =>
    props.entries.reduce((sum, e) => {
        const kcal = e.recipe?.ingredients?.reduce((s, i) => s + i.calories, 0) ?? 0;
        return sum + kcal;
    }, 0)
);

function entryFor(mealType: MealType) {
    return props.entries.find((e) => e.meal_type === mealType);
}
</script>

<template>
    <div class="day-col">
        <div class="day-header">
            <div class="day-name">{{ dayLabel.day }}</div>
            <div class="day-num">{{ dayLabel.date }}</div>
            <div v-if="dailyCalories" class="day-kcal">{{ dailyCalories }} kcal</div>
        </div>
        <div class="slots">
            <MealSlot
                v-for="mt in MEAL_TYPES"
                :key="mt"
                :mealType="mt"
                :entry="entryFor(mt)"
                @click="emit('slotClick', date, mt)"
            />
        </div>
    </div>
</template>

<style scoped>
.day-col {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 120px;
}

.day-header {
    text-align: center;
    padding-bottom: 4px;
    border-bottom: 1px solid #eee;
}

.day-name {
    font-size: 0.75em;
    text-transform: uppercase;
    color: #888;
}

.day-num {
    font-size: 1.1em;
    font-weight: 700;
}

.day-kcal {
    font-size: 0.7em;
    color: #2E7D32;
}

.slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
</style>
```

- [ ] **Step 6: Create `src/components/plan/WeekGrid.vue`**

```vue
<script setup lang="ts">
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import DayColumn from './DayColumn.vue';
import dayjs from 'dayjs';

const props = defineProps<{
    weekStart: string;
    entries: MealPlanEntryContract[];
}>();

const emit = defineEmits<{ slotClick: [date: string, mealType: MealType] }>();

function getDates(): string[] {
    return Array.from({ length: 7 }, (_, i) =>
        dayjs(props.weekStart).add(i, 'day').format('YYYY-MM-DD')
    );
}

function entriesForDate(date: string) {
    return props.entries.filter((e) => e.date === date);
}
</script>

<template>
    <div class="week-grid">
        <DayColumn
            v-for="date in getDates()"
            :key="date"
            :date="date"
            :entries="entriesForDate(date)"
            @slotClick="emit('slotClick', $event[0], $event[1])"
        />
    </div>
</template>

<style scoped>
.week-grid {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
}
</style>
```

- [ ] **Step 7: Replace `src/pages/PlanPage.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlanStore } from '../stores/plan.store.ts';
import { useRecipeStore } from '../stores/recipe.store.ts';
import WeekGrid from '../components/plan/WeekGrid.vue';
import MealSlotDialog from '../components/plan/MealSlotDialog.vue';
import type { MealType } from '../model/meal-plan-entry.contract.ts';
import dayjs from 'dayjs';

const planStore = usePlanStore();
const recipeStore = useRecipeStore();
const { entries, weekStart, loading } = storeToRefs(planStore);
const { recipes } = storeToRefs(recipeStore);

const dialogVisible = ref(false);
const dialogDate = ref('');
const dialogMealType = ref<MealType>('lunch');

const dialogEntry = ref(planStore.entryFor(dialogDate.value, dialogMealType.value));

onMounted(async () => {
    await Promise.all([planStore.fetchWeek(), recipeStore.fetchAll()]);
});

function openSlot(date: string, mealType: MealType) {
    dialogDate.value = date;
    dialogMealType.value = mealType;
    dialogEntry.value = planStore.entryFor(date, mealType);
    dialogVisible.value = true;
}

async function handleSave(recipeId: string | null, freeText: string | null) {
    await planStore.upsertEntry(dialogDate.value, dialogMealType.value, recipeId, freeText);
}

async function handleRemove() {
    const entry = planStore.entryFor(dialogDate.value, dialogMealType.value);
    if (entry) await planStore.removeEntry(entry.id);
}

const weekLabel = () => {
    const start = dayjs(weekStart.value);
    const end = start.add(6, 'day');
    return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
};
</script>

<template>
    <div class="plan-page">
        <div class="plan-header">
            <Button icon="pi pi-chevron-left" text @click="planStore.prevWeek()" />
            <span class="week-label">{{ weekLabel() }}</span>
            <Button icon="pi pi-chevron-right" text @click="planStore.nextWeek()" />
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <WeekGrid
            v-else
            :weekStart="weekStart"
            :entries="entries"
            @slotClick="openSlot($event[0], $event[1])"
        />

        <MealSlotDialog
            v-model:visible="dialogVisible"
            :entry="dialogEntry"
            :date="dialogDate"
            :mealType="dialogMealType"
            :recipes="recipes"
            @save="handleSave"
            @remove="handleRemove"
        />
    </div>
</template>

<style scoped>
.plan-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    box-sizing: border-box;
}

.plan-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.week-label {
    font-weight: 600;
}

.loading {
    text-align: center;
    color: #888;
    padding: 40px 0;
}
</style>
```

- [ ] **Step 8: Fix WeekGrid event forwarding**

`WeekGrid` emits `slotClick` with a tuple but `DayColumn` emits two separate args. Fix `WeekGrid.vue` to match:

In `WeekGrid.vue` update the `DayColumn` listener:
```vue
<DayColumn
    v-for="date in getDates()"
    :key="date"
    :date="date"
    :entries="entriesForDate(date)"
    @slotClick="(date, mealType) => emit('slotClick', date, mealType)"
/>
```

And update WeekGrid emit definition:
```typescript
const emit = defineEmits<{ slotClick: [date: string, mealType: MealType] }>();
```

In `PlanPage.vue` update the listener:
```vue
@slotClick="openSlot"
```

- [ ] **Step 9: Manual verification**

With Supabase running:
- Navigate to Plan tab — 7-day grid for current week visible
- Tap a slot — dialog opens with "From recipe" / "Free text" toggle
- Pick a recipe → slot fills with recipe name and green border
- Daily calorie total appears in day header
- Tap filled slot → edit/clear works
- Prev/next week arrows navigate correctly

---

### Task 10: Shopping list feature

**Files:**
- Create: `src/supabase/shopping.api.ts`
- Create: `src/stores/shopping.store.ts`
- Create: `src/components/shopping/ShoppingItem.vue`
- Create: `src/components/shopping/ShoppingCategory.vue`
- Replace: `src/pages/ShoppingPage.vue`

**Interfaces:**
- Consumes: `IngredientContract`, `IngredientCategory`, `INGREDIENT_CATEGORIES` from ingredient contract; `householdId` from `useAuthStore()`
- Produces: `useShoppingStore()` with `categorizedList`, `dateRange`; checkboxes are ephemeral (local state only)

- [ ] **Step 1: Create `src/supabase/shopping.api.ts`**

```typescript
import { supabase } from './supabase.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';

export interface RawShoppingIngredient extends IngredientContract {
    recipe_name: string;
}

export class ShoppingApi {
    public static async getIngredientsForRange(
        householdId: string,
        from: string,
        to: string
    ): Promise<RawShoppingIngredient[]> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select('recipe:recipes(name, ingredients(*))')
            .eq('household_id', householdId)
            .gte('date', from)
            .lte('date', to)
            .not('recipe_id', 'is', null);

        if (error) throw error;

        const result: RawShoppingIngredient[] = [];
        for (const entry of data ?? []) {
            const recipe = entry.recipe as { name: string; ingredients: IngredientContract[] } | null;
            if (!recipe) continue;
            for (const ing of recipe.ingredients ?? []) {
                result.push({ ...ing, recipe_name: recipe.name });
            }
        }
        return result;
    }
}
```

- [ ] **Step 2: Create `src/stores/shopping.store.ts`**

```typescript
import { defineStore } from 'pinia';
import type { IngredientCategory } from '../model/ingredient.contract.ts';
import { INGREDIENT_CATEGORIES } from '../model/ingredient.contract.ts';
import { ShoppingApi } from '../supabase/shopping.api.ts';
import { useAuthStore } from './auth.store.ts';
import dayjs from 'dayjs';

export interface AggregatedItem {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    checked: boolean;
}

export interface CategoryGroup {
    category: IngredientCategory;
    items: AggregatedItem[];
}

function toIso(d: dayjs.Dayjs) {
    return d.format('YYYY-MM-DD');
}

export const useShoppingStore = defineStore('shopping-store', {
    state: (): {
        from: string;
        to: string;
        items: AggregatedItem[];
        loading: boolean;
    } => ({
        from: toIso(dayjs().startOf('week').add(1, 'day')),
        to: toIso(dayjs().startOf('week').add(7, 'day')),
        items: [],
        loading: false
    }),
    getters: {
        categorizedList: (state): CategoryGroup[] => {
            return INGREDIENT_CATEGORIES
                .map((cat) => ({
                    category: cat,
                    items: state.items.filter((i) => i.category === cat)
                }))
                .filter((g) => g.items.length > 0);
        }
    },
    actions: {
        async fetchForRange() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;

            const raw = await ShoppingApi.getIngredientsForRange(householdId, this.from, this.to);

            const map = new Map<string, AggregatedItem>();
            for (const ing of raw) {
                const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}|${ing.category}`;
                const existing = map.get(key);
                if (existing) {
                    existing.quantity += ing.quantity;
                    existing.calories += ing.calories;
                    existing.protein_g += ing.protein_g;
                    existing.carbs_g += ing.carbs_g;
                    existing.fat_g += ing.fat_g;
                } else {
                    map.set(key, {
                        name: ing.name,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        category: ing.category,
                        calories: ing.calories,
                        protein_g: ing.protein_g,
                        carbs_g: ing.carbs_g,
                        fat_g: ing.fat_g,
                        checked: false
                    });
                }
            }
            this.items = Array.from(map.values());
            this.loading = false;
        },
        toggleChecked(name: string, unit: string, category: IngredientCategory) {
            const item = this.items.find(
                (i) => i.name === name && i.unit === unit && i.category === category
            );
            if (item) item.checked = !item.checked;
        },
        setRange(from: string, to: string) {
            this.from = from;
            this.to = to;
            this.fetchForRange();
        }
    }
});
```

- [ ] **Step 3: Create `src/components/shopping/ShoppingItem.vue`**

```vue
<script setup lang="ts">
import type { AggregatedItem } from '../../stores/shopping.store.ts';

defineProps<{ item: AggregatedItem }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
    <div class="shopping-item" :class="{ checked: item.checked }" @click="$emit('toggle')">
        <Checkbox :modelValue="item.checked" @update:modelValue="$emit('toggle')" binary />
        <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">{{ item.quantity }} {{ item.unit }}</span>
        </div>
        <div class="item-macros">{{ item.calories }} kcal</div>
    </div>
</template>

<style scoped>
.shopping-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;

    &.checked .item-name {
        text-decoration: line-through;
        color: #aaa;
    }
}

.item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.item-name { font-size: 0.95em; }
.item-qty  { font-size: 0.75em; color: #888; }
.item-macros { font-size: 0.75em; color: #888; }
</style>
```

- [ ] **Step 4: Create `src/components/shopping/ShoppingCategory.vue`**

```vue
<script setup lang="ts">
import type { CategoryGroup } from '../../stores/shopping.store.ts';
import type { IngredientCategory } from '../../model/ingredient.contract.ts';
import ShoppingItem from './ShoppingItem.vue';

defineProps<{ group: CategoryGroup }>();
defineEmits<{ toggle: [name: string, unit: string, category: IngredientCategory] }>();

const CATEGORY_ICONS: Record<IngredientCategory, string> = {
    fruit: 'pi pi-sun',
    vegetable: 'pi pi-leaf',
    meat: 'pi pi-circle-fill',
    dairy: 'pi pi-cloud',
    frozen: 'pi pi-snowflake',
    other: 'pi pi-box'
};
</script>

<template>
    <div class="category-group">
        <div class="category-header">
            <i :class="CATEGORY_ICONS[group.category]" />
            <span>{{ group.category.charAt(0).toUpperCase() + group.category.slice(1) }}</span>
        </div>
        <ShoppingItem
            v-for="item in group.items"
            :key="`${item.name}|${item.unit}`"
            :item="item"
            @toggle="$emit('toggle', item.name, item.unit, item.category)"
        />
    </div>
</template>

<style scoped>
.category-group {
    margin-bottom: 20px;
}

.category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.9em;
    text-transform: uppercase;
    color: #444;
    padding-bottom: 6px;
    border-bottom: 2px solid #eee;
    margin-bottom: 4px;
}
</style>
```

- [ ] **Step 5: Replace `src/pages/ShoppingPage.vue`**

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useShoppingStore } from '../stores/shopping.store.ts';
import ShoppingCategory from '../components/shopping/ShoppingCategory.vue';
import type { IngredientCategory } from '../model/ingredient.contract.ts';

const shoppingStore = useShoppingStore();
const { categorizedList, loading, from, to } = storeToRefs(shoppingStore);

onMounted(() => shoppingStore.fetchForRange());

function onDateChange() {
    shoppingStore.fetchForRange();
}

function toggle(name: string, unit: string, category: IngredientCategory) {
    shoppingStore.toggleChecked(name, unit, category);
}
</script>

<template>
    <div class="shopping-page">
        <div class="shopping-header">
            <h2 class="title" style="margin-bottom: 0">Shopping List</h2>
        </div>

        <div class="date-range">
            <label>From</label>
            <DatePicker v-model="from" dateFormat="yy-mm-dd" @date-select="onDateChange" />
            <label>To</label>
            <DatePicker v-model="to" dateFormat="yy-mm-dd" @date-select="onDateChange" />
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <div v-else-if="!categorizedList.length" class="empty">
            No ingredients found for this period.
        </div>
        <div v-else>
            <ShoppingCategory
                v-for="group in categorizedList"
                :key="group.category"
                :group="group"
                @toggle="toggle"
            />
        </div>
    </div>
</template>

<style scoped>
.shopping-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.shopping-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.date-range {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    label { font-size: 0.85em; color: #555; }
}

.loading, .empty {
    text-align: center;
    color: #888;
    padding: 40px 0;
}
</style>
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 7: Manual verification**

With Supabase running and some meal plan entries that reference recipes with ingredients:
- Navigate to Shopping tab — "this week" list renders automatically
- Ingredients from planned recipe meals are grouped by category (fruit → vegetable → meat → dairy → frozen → other)
- Same ingredient + same unit from multiple recipes is aggregated into one row with summed quantity
- Checking an item marks it visually (strikethrough); state resets when date range changes
- Change date range via pickers → list refreshes

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Vue 3 + TS + Vite + PrimeVue + Pinia + Supabase + PWA | Task 1, 4 |
| Base path `/mealplanner/` | Task 1 (vite.config.ts), Task 5 (router) |
| GitHub Pages deploy workflow | Task 3 |
| Supabase migration runner workflow | Task 3 |
| Supabase migrations for all 6 tables | Task 2 |
| RLS on all household-scoped tables | Task 2 |
| ingredient_category enum (6 values) | Task 2, 6 |
| meal_type enum (4 values) | Task 2, 6 |
| Login / logout / auth guard | Task 7 |
| Recipe CRUD with ingredients | Task 8 |
| Nutrition totals per recipe | Task 8 (RecipeForm totals) |
| Plan page — 7-day grid, meal types | Task 9 |
| Plan slots — recipe OR free text | Task 9 (MealSlotDialog) |
| Daily calorie total in day header | Task 9 (DayColumn) |
| Shopping list — aggregated ingredients | Task 10 |
| Shopping list — categorized, sorted | Task 10 (INGREDIENT_CATEGORIES order) |
| Shopping list — "this week" default | Task 10 (store default state) |
| Shopping list — custom date range | Task 10 (ShoppingPage date pickers) |
| Shopping list — checkbox to tick off | Task 10 (ShoppingItem + store) |
| Profile page — display name + logout | Task 7 |
| Recipe delete preserves plan slot text | Task 8 (RecipeApi.remove) |

All requirements covered. No gaps found.

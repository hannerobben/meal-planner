# Ingredient Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recipe-embedded ingredient rows with a household-scoped ingredient catalogue; recipes link to catalogue entries via a `recipe_ingredients` junction table, with macros derived from quantity × per-100 values.

**Architecture:** Two new migrations rename/recreate the `ingredients` table as a household catalogue and add a `recipe_ingredients` junction. TypeScript contracts, the Supabase API layer, Pinia stores, and Vue components are updated bottom-up (DB → contracts → API → stores → UI). A new Ingredients page is added and the Profile tab is replaced in the bottom nav.

**Tech Stack:** Vue 3 + TypeScript, Pinia, Supabase JS client, PrimeVue 4 (AutoComplete, Dialog, DataTable), SCSS.

## Global Constraints

- No test framework configured — use `npm run build` (runs `vue-tsc -b`) to verify TypeScript correctness after every task.
- `npm run supabase` starts the local Supabase instance; `supabase db reset` re-applies all migrations from scratch.
- Vite base path is `/mealplanner/` — do not change.
- PrimeVue components (AutoComplete, Dialog, InputNumber, InputText, Select, Button, Toast) are globally registered; no per-component imports needed.
- All Supabase tables are RLS-protected; household_id is resolved via `select household_id from users where id = auth.uid()`.
- SCSS only — no Tailwind.
- Macros derivation formula: `value = (quantity / 100) × macros_per_100` (applied client-side).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260623000013_rework_ingredients.sql` | Create | Drop old ingredients table, create catalogue |
| `supabase/migrations/20260623000014_create_recipe_ingredients.sql` | Create | recipe_ingredients junction table |
| `src/model/ingredient.contract.ts` | Modify | Catalogue entry shape |
| `src/model/recipe-ingredient.contract.ts` | Create | Junction row shape |
| `src/model/recipe.contract.ts` | Modify | ingredients → RecipeIngredientContract[] |
| `src/supabase/ingredient.api.ts` | Create | CRUD for catalogue entries |
| `src/supabase/recipe.api.ts` | Modify | New select query + upsertRecipeIngredients |
| `src/supabase/shopping.api.ts` | Modify | Join through recipe_ingredients |
| `src/stores/ingredient.store.ts` | Create | Catalogue state + CRUD actions |
| `src/stores/shopping.store.ts` | Modify | Aggregation with derived macros |
| `src/layouts/DefaultLayout.vue` | Modify | Load ingredient store on mount |
| `src/router/route.ts` | Modify | Add /ingredients route |
| `src/components/AppFooterMenu.vue` | Modify | Plan·Recipes·Ingredients·Shopping tabs |
| `src/pages/IngredientsPage.vue` | Create | Catalogue management page |
| `src/components/recipe/RecipeIngredientRow.vue` | Create | Row with autocomplete + derived macros |
| `src/components/recipe/RecipeForm.vue` | Modify | Use new row component + upsertRecipeIngredients |
| `src/components/recipe/RecipeCard.vue` | Modify | Derive totalCalories from new contract |
| `src/components/recipe/IngredientRow.vue` | Delete | Replaced by RecipeIngredientRow |

---

### Task 1: DB Migrations

**Files:**
- Create: `supabase/migrations/20260623000013_rework_ingredients.sql`
- Create: `supabase/migrations/20260623000014_create_recipe_ingredients.sql`

**Interfaces:**
- Produces: `public.ingredients` (catalogue table), `public.recipe_ingredients` (junction table)

- [ ] **Step 1: Create migration 13 — rework ingredients**

Create `supabase/migrations/20260623000013_rework_ingredients.sql`:

```sql
drop table public.ingredients;

create table public.ingredients (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id),
    name                text not null,
    category            public.ingredient_category not null,
    base_unit           text not null,
    calories_per_100    numeric not null default 0,
    protein_g_per_100   numeric not null default 0,
    carbs_g_per_100     numeric not null default 0,
    fat_g_per_100       numeric not null default 0
);

alter table public.ingredients enable row level security;

create policy "household ingredient access"
    on public.ingredients
    for all
    using (
        household_id = (select household_id from public.users where id = auth.uid())
    )
    with check (
        household_id = (select household_id from public.users where id = auth.uid())
    );
```

- [ ] **Step 2: Create migration 14 — recipe_ingredients junction**

Create `supabase/migrations/20260623000014_create_recipe_ingredients.sql`:

```sql
create table public.recipe_ingredients (
    id              uuid primary key default gen_random_uuid(),
    recipe_id       uuid not null references public.recipes(id) on delete cascade,
    ingredient_id   uuid not null references public.ingredients(id) on delete restrict,
    quantity        numeric not null
);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients via owned recipe"
    on public.recipe_ingredients
    for all
    using (
        recipe_id in (
            select id from public.recipes
            where household_id = (select household_id from public.users where id = auth.uid())
        )
    )
    with check (
        recipe_id in (
            select id from public.recipes
            where household_id = (select household_id from public.users where id = auth.uid())
        )
    );
```

- [ ] **Step 3: Apply migrations locally**

```bash
npm run supabase   # start Supabase if not running
supabase db reset  # re-applies all migrations from scratch
```

Expected output ends with: `Finished supabase db reset.`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260623000013_rework_ingredients.sql supabase/migrations/20260623000014_create_recipe_ingredients.sql
git commit -m "feat: add ingredient catalogue and recipe_ingredients tables"
```

---

### Task 2: TypeScript Contracts

**Files:**
- Modify: `src/model/ingredient.contract.ts`
- Create: `src/model/recipe-ingredient.contract.ts`
- Modify: `src/model/recipe.contract.ts`

**Interfaces:**
- Produces:
  - `IngredientContract` — catalogue entry (no recipe_id, no direct macros; has per-100 fields)
  - `RecipeIngredientContract` — junction row with optional joined ingredient
  - `RecipeContract.ingredients` typed as `RecipeIngredientContract[]`

- [ ] **Step 1: Update ingredient.contract.ts**

Replace the entire file content:

```ts
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
    household_id: string;
    name: string;
    category: IngredientCategory;
    base_unit: string;
    calories_per_100: number;
    protein_g_per_100: number;
    carbs_g_per_100: number;
    fat_g_per_100: number;
}
```

- [ ] **Step 2: Create recipe-ingredient.contract.ts**

```ts
import type { IngredientContract } from './ingredient.contract.ts';

export interface RecipeIngredientContract {
    id: string;
    recipe_id: string;
    ingredient_id: string;
    quantity: number;
    ingredient?: IngredientContract;
}
```

- [ ] **Step 3: Update recipe.contract.ts**

```ts
import type { RecipeIngredientContract } from './recipe-ingredient.contract.ts';
import type { MealType } from './meal-plan-entry.contract.ts';

export interface RecipeContract {
    id: string;
    household_id: string;
    name: string;
    type: MealType;
    notes: string | null;
    image_url: string | null;
    created_at: string;
    ingredients?: RecipeIngredientContract[];
}
```

- [ ] **Step 4: Verify types**

```bash
npm run build
```

Expected: build completes (may show downstream errors from files not yet updated — that's fine at this stage as long as there are no errors *in the three files just changed*). If there are errors in these three files, fix them before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/model/ingredient.contract.ts src/model/recipe-ingredient.contract.ts src/model/recipe.contract.ts
git commit -m "feat: update ingredient and recipe contracts for catalogue model"
```

---

### Task 3: Ingredient API & Store

**Files:**
- Create: `src/supabase/ingredient.api.ts`
- Create: `src/stores/ingredient.store.ts`
- Modify: `src/layouts/DefaultLayout.vue`

**Interfaces:**
- Consumes: `IngredientContract` from `src/model/ingredient.contract.ts`
- Produces:
  - `IngredientApi.getAll(householdId: string): Promise<IngredientContract[]>`
  - `IngredientApi.create(householdId: string, input: IngredientInput): Promise<IngredientContract>`
  - `IngredientApi.update(id: string, input: IngredientInput): Promise<void>`
  - `IngredientApi.remove(id: string): Promise<void>`
  - `useIngredientStore()` — Pinia store with `ingredients: IngredientContract[]`, actions: `fetchAll`, `create`, `update`, `remove`

- [ ] **Step 1: Create ingredient.api.ts**

```ts
import { supabase } from './supabase.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';

export type IngredientInput = Omit<IngredientContract, 'id' | 'household_id'>;

export class IngredientApi {
    public static async getAll(householdId: string): Promise<IngredientContract[]> {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .eq('household_id', householdId)
            .order('name');
        if (error) throw error;
        return data ?? [];
    }

    public static async create(householdId: string, input: IngredientInput): Promise<IngredientContract> {
        const { data, error } = await supabase
            .from('ingredients')
            .insert({ ...input, household_id: householdId })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    public static async update(id: string, input: IngredientInput): Promise<void> {
        const { error } = await supabase
            .from('ingredients')
            .update(input)
            .eq('id', id);
        if (error) throw error;
    }

    public static async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('ingredients')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
```

- [ ] **Step 2: Create ingredient.store.ts**

```ts
import { defineStore } from 'pinia';
import type { IngredientContract } from '../model/ingredient.contract.ts';
import { IngredientApi, type IngredientInput } from '../supabase/ingredient.api.ts';
import { useAuthStore } from './auth.store.ts';

export const useIngredientStore = defineStore('ingredient-store', {
    state: (): {
        ingredients: IngredientContract[];
        loading: boolean;
    } => ({ ingredients: [], loading: false }),
    actions: {
        async fetchAll() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            try {
                this.ingredients = await IngredientApi.getAll(householdId);
            } finally {
                this.loading = false;
            }
        },
        async create(input: IngredientInput): Promise<IngredientContract> {
            const householdId = useAuthStore().householdId!;
            const created = await IngredientApi.create(householdId, input);
            this.ingredients.push(created);
            this.ingredients.sort((a, b) => a.name.localeCompare(b.name));
            return created;
        },
        async update(id: string, input: IngredientInput): Promise<void> {
            await IngredientApi.update(id, input);
            const idx = this.ingredients.findIndex((i) => i.id === id);
            if (idx !== -1) {
                this.ingredients[idx] = { ...this.ingredients[idx], ...input };
                this.ingredients.sort((a, b) => a.name.localeCompare(b.name));
            }
        },
        async remove(id: string): Promise<void> {
            await IngredientApi.remove(id);
            this.ingredients = this.ingredients.filter((i) => i.id !== id);
        }
    }
});
```

- [ ] **Step 3: Load ingredient store in DefaultLayout.vue**

Replace the entire file:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import AppFooterMenu from '../components/AppFooterMenu.vue';
import { useIngredientStore } from '../stores/ingredient.store.ts';

onMounted(() => {
    useIngredientStore().fetchAll();
});
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

- [ ] **Step 4: Verify types**

```bash
npm run build
```

Expected: no errors in the three files just created/modified.

- [ ] **Step 5: Commit**

```bash
git add src/supabase/ingredient.api.ts src/stores/ingredient.store.ts src/layouts/DefaultLayout.vue
git commit -m "feat: add ingredient catalogue API, store, and load in DefaultLayout"
```

---

### Task 4: Recipe API Update

**Files:**
- Modify: `src/supabase/recipe.api.ts`

**Interfaces:**
- Consumes: `RecipeIngredientContract` from `src/model/recipe-ingredient.contract.ts`
- Produces:
  - `RecipeApi.upsertRecipeIngredients(recipeId: string, items: { ingredient_id: string; quantity: number }[]): Promise<void>`
  - `RecipeApi.getAll` and `RecipeApi.getById` now join `recipe_ingredients(*, ingredient:ingredients(*))`

- [ ] **Step 1: Update recipe.api.ts**

Replace the entire file:

```ts
import { supabase } from './supabase.ts';
import type { RecipeContract } from '../model/recipe.contract.ts';
import type { MealType } from '../model/meal-plan-entry.contract.ts';

export class RecipeApi {
    public static async getAll(householdId: string): Promise<RecipeContract[]> {
        const { data, error } = await supabase
            .from('recipes')
            .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
            .eq('household_id', householdId)
            .order('name');

        if (error) throw error;
        return data ?? [];
    }

    public static async getById(id: string): Promise<RecipeContract | undefined> {
        const { data, error } = await supabase
            .from('recipes')
            .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ?? undefined;
    }

    public static async create(
        householdId: string,
        name: string,
        type: MealType,
        notes: string | null
    ): Promise<RecipeContract> {
        const { data, error } = await supabase
            .from('recipes')
            .insert({ household_id: householdId, name, type, notes })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    public static async update(
        id: string,
        name: string,
        type: MealType,
        notes: string | null,
        image_url: string | null
    ): Promise<void> {
        const { error } = await supabase
            .from('recipes')
            .update({ name, type, notes, image_url })
            .eq('id', id);
        if (error) throw error;
    }

    public static async uploadImage(recipeId: string, file: File): Promise<string> {
        const { error } = await supabase.storage
            .from('recipe-images')
            .upload(recipeId, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from('recipe-images').getPublicUrl(recipeId);
        return data.publicUrl;
    }

    public static async deleteImage(recipeId: string): Promise<void> {
        await supabase.storage.from('recipe-images').remove([recipeId]);
    }

    public static async remove(id: string): Promise<void> {
        const { data: entries } = await supabase
            .from('meal_plan_entries')
            .select('id')
            .eq('recipe_id', id);

        if (entries?.length) {
            const { data: recipe } = await supabase
                .from('recipes')
                .select('name')
                .eq('id', id)
                .single();
            const recipeName = recipe?.name ?? 'Deleted recipe';
            await Promise.all(
                entries.map((entry) =>
                    supabase
                        .from('meal_plan_entries')
                        .update({ recipe_id: null, free_text: recipeName })
                        .eq('id', entry.id)
                )
            );
        }

        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw error;
        await supabase.storage.from('recipe-images').remove([id]);
    }

    public static async upsertRecipeIngredients(
        recipeId: string,
        items: { ingredient_id: string; quantity: number }[]
    ): Promise<void> {
        const { error: delError } = await supabase
            .from('recipe_ingredients')
            .delete()
            .eq('recipe_id', recipeId);
        if (delError) throw delError;

        if (!items.length) return;

        const rows = items.map((i) => ({ ...i, recipe_id: recipeId }));
        const { error } = await supabase.from('recipe_ingredients').insert(rows);
        if (error) throw error;
    }
}
```

- [ ] **Step 2: Verify types**

```bash
npm run build
```

Expected: no errors in `recipe.api.ts`. Downstream errors in components (RecipeCard, RecipeForm) are expected and will be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/supabase/recipe.api.ts
git commit -m "feat: update RecipeApi to use recipe_ingredients junction"
```

---

### Task 5: Shopping API & Store Update

**Files:**
- Modify: `src/supabase/shopping.api.ts`
- Modify: `src/stores/shopping.store.ts`

**Interfaces:**
- Consumes: `IngredientContract` from `src/model/ingredient.contract.ts`
- Produces: `RawShoppingItem` with `{ recipe_name, quantity, ingredient: IngredientContract }`; `AggregatedItem` unchanged (name, quantity, unit, category, calories, protein_g, carbs_g, fat_g, checked)

- [ ] **Step 1: Update shopping.api.ts**

Replace the entire file:

```ts
import { supabase } from './supabase.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';

export interface RawShoppingItem {
    recipe_name: string;
    quantity: number;
    ingredient: IngredientContract;
}

export class ShoppingApi {
    public static async getIngredientsForRange(
        householdId: string,
        from: string,
        to: string
    ): Promise<RawShoppingItem[]> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select('recipe:recipes(name, recipe_ingredients(quantity, ingredient:ingredients(*)))')
            .eq('household_id', householdId)
            .gte('date', from)
            .lte('date', to)
            .not('recipe_id', 'is', null);

        if (error) throw error;

        const result: RawShoppingItem[] = [];
        for (const entry of data ?? []) {
            const recipe = entry.recipe as unknown as {
                name: string;
                recipe_ingredients: { quantity: number; ingredient: IngredientContract }[];
            } | null;
            if (!recipe) continue;
            for (const ri of recipe.recipe_ingredients ?? []) {
                result.push({ recipe_name: recipe.name, quantity: ri.quantity, ingredient: ri.ingredient });
            }
        }
        return result;
    }
}
```

- [ ] **Step 2: Update shopping.store.ts**

Replace the entire file:

```ts
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
            try {
                const raw = await ShoppingApi.getIngredientsForRange(householdId, this.from, this.to);

                const map = new Map<string, AggregatedItem>();
                for (const item of raw) {
                    const { ingredient, quantity } = item;
                    const factor = quantity / 100;
                    const key = `${ingredient.name.toLowerCase()}|${ingredient.base_unit.toLowerCase()}|${ingredient.category}`;
                    const existing = map.get(key);
                    if (existing) {
                        existing.quantity += quantity;
                        existing.calories += ingredient.calories_per_100 * factor;
                        existing.protein_g += ingredient.protein_g_per_100 * factor;
                        existing.carbs_g += ingredient.carbs_g_per_100 * factor;
                        existing.fat_g += ingredient.fat_g_per_100 * factor;
                    } else {
                        map.set(key, {
                            name: ingredient.name,
                            quantity,
                            unit: ingredient.base_unit,
                            category: ingredient.category,
                            calories: ingredient.calories_per_100 * factor,
                            protein_g: ingredient.protein_g_per_100 * factor,
                            carbs_g: ingredient.carbs_g_per_100 * factor,
                            fat_g: ingredient.fat_g_per_100 * factor,
                            checked: false
                        });
                    }
                }
                this.items = Array.from(map.values());
            } finally {
                this.loading = false;
            }
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

- [ ] **Step 3: Verify types**

```bash
npm run build
```

Expected: no errors in the two modified files.

- [ ] **Step 4: Commit**

```bash
git add src/supabase/shopping.api.ts src/stores/shopping.store.ts
git commit -m "feat: update shopping API and store for catalogue-derived macros"
```

---

### Task 6: Navigation & Routes

**Files:**
- Modify: `src/router/route.ts`
- Modify: `src/components/AppFooterMenu.vue`

**Interfaces:**
- Produces: route name `'Ingredients'` at path `/ingredients`; nav tabs Plan · Recipes · Ingredients · Shopping

- [ ] **Step 1: Update route.ts**

Replace the entire file:

```ts
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import PlanPage from '../pages/PlanPage.vue';
import RecipesPage from '../pages/RecipesPage.vue';
import RecipeDetailPage from '../pages/RecipeDetailPage.vue';
import IngredientsPage from '../pages/IngredientsPage.vue';
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
            { path: 'ingredients', name: 'Ingredients', component: IngredientsPage },
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

- [ ] **Step 2: Update AppFooterMenu.vue**

Replace the entire file:

```vue
<script setup lang="ts">
import AppTabMenu from './AppTabMenu.vue';

const items = [
    { label: 'Plan', route: { name: 'Plan' }, icon: 'pi pi-fw pi-calendar' },
    { label: 'Recipes', route: { name: 'Recipes' }, icon: 'pi pi-fw pi-book' },
    { label: 'Ingredients', route: { name: 'Ingredients' }, icon: 'pi pi-fw pi-list' },
    { label: 'Shopping', route: { name: 'Shopping' }, icon: 'pi pi-fw pi-shopping-cart' }
];
</script>

<template>
    <div class="footer">
        <AppTabMenu :items="items" />
    </div>
</template>

<style scoped></style>
```

- [ ] **Step 3: Create a placeholder IngredientsPage.vue** (required so the router import compiles)

Create `src/pages/IngredientsPage.vue`:

```vue
<template>
    <div style="padding: 20px">
        <h2>Ingredients</h2>
        <p>Coming soon.</p>
    </div>
</template>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build. The app now has 4 nav tabs; navigating to `/ingredients` shows the placeholder.

- [ ] **Step 5: Commit**

```bash
git add src/router/route.ts src/components/AppFooterMenu.vue src/pages/IngredientsPage.vue
git commit -m "feat: add ingredients route and update bottom nav"
```

---

### Task 7: Ingredients Page

**Files:**
- Modify: `src/pages/IngredientsPage.vue` (replace placeholder)

**Interfaces:**
- Consumes: `useIngredientStore()` — `ingredients`, `create`, `update`, `remove`
- Consumes: `IngredientContract`, `INGREDIENT_CATEGORIES` from `src/model/ingredient.contract.ts`

- [ ] **Step 1: Replace IngredientsPage.vue with full implementation**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useIngredientStore } from '../stores/ingredient.store.ts';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '../model/ingredient.contract.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';
import type { IngredientInput } from '../supabase/ingredient.api.ts';

const toast = useToast();
const store = useIngredientStore();

const categoryOptions = INGREDIENT_CATEGORIES.map((c) => ({ label: c, value: c }));

const editingId = ref<string | null>(null);
const editDraft = ref<IngredientInput | null>(null);

function startEdit(ingredient: IngredientContract) {
    editingId.value = ingredient.id;
    editDraft.value = {
        name: ingredient.name,
        category: ingredient.category,
        base_unit: ingredient.base_unit,
        calories_per_100: ingredient.calories_per_100,
        protein_g_per_100: ingredient.protein_g_per_100,
        carbs_g_per_100: ingredient.carbs_g_per_100,
        fat_g_per_100: ingredient.fat_g_per_100
    };
}

function cancelEdit() {
    editingId.value = null;
    editDraft.value = null;
}

async function saveEdit() {
    if (!editingId.value || !editDraft.value) return;
    try {
        await store.update(editingId.value, editDraft.value);
        cancelEdit();
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

async function removeIngredient(id: string) {
    try {
        await store.remove(id);
    } catch (e) {
        toast.add({
            severity: 'error',
            summary: 'Cannot delete',
            detail: 'This ingredient is used in one or more recipes.',
            life: 5000
        });
    }
}

const showNewDialog = ref(false);
const newDraft = ref<IngredientInput>({
    name: '',
    category: 'other' as IngredientCategory,
    base_unit: 'g',
    calories_per_100: 0,
    protein_g_per_100: 0,
    carbs_g_per_100: 0,
    fat_g_per_100: 0
});

function openNewDialog() {
    newDraft.value = {
        name: '',
        category: 'other' as IngredientCategory,
        base_unit: 'g',
        calories_per_100: 0,
        protein_g_per_100: 0,
        carbs_g_per_100: 0,
        fat_g_per_100: 0
    };
    showNewDialog.value = true;
}

async function saveNew() {
    if (!newDraft.value.name.trim()) return;
    try {
        await store.create(newDraft.value);
        showNewDialog.value = false;
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}
</script>

<template>
    <div class="ingredients-page">
        <div class="page-header">
            <h2>Ingredients</h2>
            <Button icon="pi pi-plus" label="New" @click="openNewDialog" />
        </div>

        <div v-if="store.loading" style="padding: 20px">Loading…</div>

        <div v-else class="ingredient-list">
            <div
                v-for="ingredient in store.ingredients"
                :key="ingredient.id"
                class="ingredient-item"
            >
                <template v-if="editingId === ingredient.id && editDraft">
                    <div class="edit-row">
                        <InputText v-model="editDraft.name" placeholder="Name" />
                        <Select
                            v-model="editDraft.category"
                            :options="categoryOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Category"
                        />
                        <InputText v-model="editDraft.base_unit" placeholder="Unit" />
                        <InputNumber v-model="editDraft.calories_per_100" placeholder="kcal/100" :min="0" />
                        <InputNumber v-model="editDraft.protein_g_per_100" placeholder="P/100" :min="0" />
                        <InputNumber v-model="editDraft.carbs_g_per_100" placeholder="C/100" :min="0" />
                        <InputNumber v-model="editDraft.fat_g_per_100" placeholder="F/100" :min="0" />
                        <div class="edit-actions">
                            <Button icon="pi pi-check" text severity="success" @click="saveEdit" />
                            <Button icon="pi pi-times" text severity="secondary" @click="cancelEdit" />
                        </div>
                    </div>
                </template>
                <template v-else>
                    <div class="display-row">
                        <span class="ing-name">{{ ingredient.name }}</span>
                        <span class="ing-meta">{{ ingredient.category }}</span>
                        <span class="ing-meta">{{ ingredient.base_unit }}</span>
                        <span class="ing-macro">{{ ingredient.calories_per_100 }} kcal</span>
                        <span class="ing-macro">P {{ ingredient.protein_g_per_100 }}g</span>
                        <span class="ing-macro">C {{ ingredient.carbs_g_per_100 }}g</span>
                        <span class="ing-macro">F {{ ingredient.fat_g_per_100 }}g</span>
                        <div class="row-actions">
                            <Button icon="pi pi-pencil" text severity="secondary" @click="startEdit(ingredient)" />
                            <Button icon="pi pi-trash" text severity="danger" @click="removeIngredient(ingredient.id)" />
                        </div>
                    </div>
                </template>
            </div>

            <div v-if="!store.ingredients.length" class="empty">
                No ingredients yet. Add one to get started.
            </div>
        </div>

        <Dialog v-model:visible="showNewDialog" header="New Ingredient" modal style="width: 360px">
            <div class="new-form">
                <div class="field">
                    <label>Name *</label>
                    <InputText v-model="newDraft.name" placeholder="e.g. Chicken breast" />
                </div>
                <div class="field">
                    <label>Category</label>
                    <Select
                        v-model="newDraft.category"
                        :options="categoryOptions"
                        optionLabel="label"
                        optionValue="value"
                    />
                </div>
                <div class="field">
                    <label>Base unit</label>
                    <InputText v-model="newDraft.base_unit" placeholder="g" />
                </div>
                <div class="macro-row">
                    <div class="field">
                        <label>kcal / 100</label>
                        <InputNumber v-model="newDraft.calories_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Protein / 100</label>
                        <InputNumber v-model="newDraft.protein_g_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Carbs / 100</label>
                        <InputNumber v-model="newDraft.carbs_g_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Fat / 100</label>
                        <InputNumber v-model="newDraft.fat_g_per_100" :min="0" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="showNewDialog = false" />
                <Button label="Save" @click="saveNew" :disabled="!newDraft.name.trim()" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.ingredients-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 { margin: 0; }
}

.ingredient-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.display-row,
.edit-row {
    display: grid;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
}

.display-row {
    grid-template-columns: minmax(0, 2fr) 1fr 0.5fr repeat(4, 0.7fr) auto;
}

.edit-row {
    grid-template-columns: minmax(0, 2fr) 1fr 0.5fr repeat(4, 0.7fr) auto;
}

.ing-name { font-weight: 500; }
.ing-meta { font-size: 0.85em; color: #666; }
.ing-macro { font-size: 0.8em; color: #555; }

.row-actions,
.edit-actions {
    display: flex;
    gap: 2px;
}

.empty {
    color: #999;
    font-size: 0.9em;
    padding: 20px 0;
    text-align: center;
}

.new-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label { font-size: 0.8em; color: #555; }
}

.macro-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 3: Manual test**

Start the dev server (`npm run dev`), navigate to `/mealplanner/ingredients`:
- Page loads with "No ingredients yet" message
- Clicking "New" opens the dialog with all fields
- Filling in a name and saving adds it to the list
- Edit pencil expands the row to editable fields; saving updates it
- Delete removes it (no recipes use it yet so it should succeed)

- [ ] **Step 4: Commit**

```bash
git add src/pages/IngredientsPage.vue
git commit -m "feat: add ingredients catalogue management page"
```

---

### Task 8: Recipe Ingredient Row & Form

**Files:**
- Create: `src/components/recipe/RecipeIngredientRow.vue`
- Modify: `src/components/recipe/RecipeForm.vue`
- Modify: `src/components/recipe/RecipeCard.vue`
- Delete: `src/components/recipe/IngredientRow.vue`

**Interfaces:**
- Consumes: `useIngredientStore()` — `ingredients`, `create`
- Consumes: `RecipeIngredientContract` from `src/model/recipe-ingredient.contract.ts`
- Consumes: `RecipeApi.upsertRecipeIngredients`

- [ ] **Step 1: Create RecipeIngredientRow.vue**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIngredientStore } from '../../stores/ingredient.store.ts';
import type { IngredientContract, IngredientCategory } from '../../model/ingredient.contract.ts';
import { INGREDIENT_CATEGORIES } from '../../model/ingredient.contract.ts';
import type { IngredientInput } from '../../supabase/ingredient.api.ts';
import { useToast } from 'primevue/usetoast';

export interface RecipeIngredientRowData {
    _key: string;
    ingredient_id: string;
    ingredient: IngredientContract | null;
    quantity: number;
}

const props = defineProps<{ modelValue: RecipeIngredientRowData }>();
const emit = defineEmits<{
    'update:modelValue': [value: RecipeIngredientRowData];
    remove: [];
}>();

const store = useIngredientStore();
const toast = useToast();

const suggestions = ref<(IngredientContract | { id: '__new__'; name: string })[]>([]);

function search(event: { query: string }) {
    const q = event.query.toLowerCase();
    const matches = store.ingredients.filter((i) => i.name.toLowerCase().includes(q));
    suggestions.value = [
        ...matches,
        { id: '__new__', name: `+ Create "${event.query}"` }
    ];
}

function onSelect(event: { value: IngredientContract | { id: '__new__'; name: string } }) {
    if (event.value.id === '__new__') {
        const query = (event.value.name.match(/^. Create "(.+)"$/) ?? [])[1] ?? '';
        openCreateDialog(query);
        return;
    }
    const ing = event.value as IngredientContract;
    emit('update:modelValue', { ...props.modelValue, ingredient_id: ing.id, ingredient: ing });
}

const derived = computed(() => {
    const i = props.modelValue.ingredient;
    if (!i || !props.modelValue.quantity) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const f = props.modelValue.quantity / 100;
    return {
        calories: Math.round(i.calories_per_100 * f),
        protein_g: Math.round(i.protein_g_per_100 * f * 10) / 10,
        carbs_g: Math.round(i.carbs_g_per_100 * f * 10) / 10,
        fat_g: Math.round(i.fat_g_per_100 * f * 10) / 10
    };
});

const showCreateDialog = ref(false);
const categoryOptions = INGREDIENT_CATEGORIES.map((c) => ({ label: c, value: c }));
const newDraft = ref<IngredientInput>({
    name: '',
    category: 'other' as IngredientCategory,
    base_unit: 'g',
    calories_per_100: 0,
    protein_g_per_100: 0,
    carbs_g_per_100: 0,
    fat_g_per_100: 0
});

function openCreateDialog(prefill: string) {
    newDraft.value = {
        name: prefill,
        category: 'other' as IngredientCategory,
        base_unit: 'g',
        calories_per_100: 0,
        protein_g_per_100: 0,
        carbs_g_per_100: 0,
        fat_g_per_100: 0
    };
    showCreateDialog.value = true;
}

async function saveNew() {
    if (!newDraft.value.name.trim()) return;
    try {
        const created = await store.create(newDraft.value);
        emit('update:modelValue', { ...props.modelValue, ingredient_id: created.id, ingredient: created });
        showCreateDialog.value = false;
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}
</script>

<template>
    <div class="recipe-ingredient-row">
        <AutoComplete
            :modelValue="modelValue.ingredient"
            :suggestions="suggestions"
            optionLabel="name"
            placeholder="Search ingredient…"
            @complete="search"
            @option-select="onSelect"
            dropdown
        />
        <InputNumber
            :modelValue="modelValue.quantity"
            @update:modelValue="emit('update:modelValue', { ...modelValue, quantity: $event ?? 0 })"
            :placeholder="modelValue.ingredient?.base_unit ?? 'qty'"
            :min="0"
        />
        <span class="unit-label">{{ modelValue.ingredient?.base_unit ?? '' }}</span>
        <span class="macro">{{ derived.calories }} kcal</span>
        <span class="macro">P {{ derived.protein_g }}g</span>
        <span class="macro">C {{ derived.carbs_g }}g</span>
        <span class="macro">F {{ derived.fat_g }}g</span>
        <Button icon="pi pi-trash" text severity="danger" @click="emit('remove')" />
    </div>

    <Dialog v-model:visible="showCreateDialog" header="New Ingredient" modal style="width: 360px">
        <div class="new-form">
            <div class="field">
                <label>Name *</label>
                <InputText v-model="newDraft.name" />
            </div>
            <div class="field">
                <label>Category</label>
                <Select
                    v-model="newDraft.category"
                    :options="categoryOptions"
                    optionLabel="label"
                    optionValue="value"
                />
            </div>
            <div class="field">
                <label>Base unit</label>
                <InputText v-model="newDraft.base_unit" placeholder="g" />
            </div>
            <div class="macro-row">
                <div class="field">
                    <label>kcal / 100</label>
                    <InputNumber v-model="newDraft.calories_per_100" :min="0" />
                </div>
                <div class="field">
                    <label>Protein / 100</label>
                    <InputNumber v-model="newDraft.protein_g_per_100" :min="0" />
                </div>
                <div class="field">
                    <label>Carbs / 100</label>
                    <InputNumber v-model="newDraft.carbs_g_per_100" :min="0" />
                </div>
                <div class="field">
                    <label>Fat / 100</label>
                    <InputNumber v-model="newDraft.fat_g_per_100" :min="0" />
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="Cancel" text severity="secondary" @click="showCreateDialog = false" />
            <Button label="Save" @click="saveNew" :disabled="!newDraft.name.trim()" />
        </template>
    </Dialog>
</template>

<style scoped>
.recipe-ingredient-row {
    display: grid;
    grid-template-columns: minmax(0, 2.5fr) minmax(0, 1fr) 0.6fr repeat(4, 0.8fr) auto;
    gap: 6px;
    align-items: center;
}

.recipe-ingredient-row :deep(.p-autocomplete),
.recipe-ingredient-row :deep(.p-inputnumber) {
    width: 100%;
    min-width: 0;
}

.unit-label {
    font-size: 0.8em;
    color: #888;
    text-align: center;
}

.macro {
    font-size: 0.8em;
    color: #555;
    text-align: right;
}

.new-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label { font-size: 0.8em; color: #555; }
}

.macro-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
</style>
```

- [ ] **Step 2: Update RecipeForm.vue**

Replace the entire file:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../../stores/auth.store.ts';
import { RecipeApi } from '../../supabase/recipe.api.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import RecipeIngredientRow from './RecipeIngredientRow.vue';
import type { RecipeIngredientRowData } from './RecipeIngredientRow.vue';
import { MEAL_TYPES, type MealType } from '../../model/meal-plan-entry.contract.ts';

const props = defineProps<{ recipe?: RecipeContract }>();

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const name = ref(props.recipe?.name ?? '');
const type = ref<MealType>(props.recipe?.type ?? 'dinner');
const notes = ref(props.recipe?.notes ?? '');

const typeOptions = MEAL_TYPES.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }));
const saving = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);
const pendingImageFile = ref<File | null>(null);
const removeImageFlag = ref(false);

const previewUrl = computed(() => {
    if (removeImageFlag.value) return null;
    if (pendingImageFile.value) return URL.createObjectURL(pendingImageFile.value);
    return props.recipe?.image_url ?? null;
});

function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    pendingImageFile.value = file;
    removeImageFlag.value = false;
}

function clearImage() {
    pendingImageFile.value = null;
    removeImageFlag.value = true;
    if (fileInput.value) fileInput.value.value = '';
}

let _keyCounter = 0;
function blankRow(): RecipeIngredientRowData {
    return { _key: String(++_keyCounter), ingredient_id: '', ingredient: null, quantity: 0 };
}

const ingredients = ref<RecipeIngredientRowData[]>(
    props.recipe?.ingredients?.map((ri, idx) => ({
        _key: String(idx),
        ingredient_id: ri.ingredient_id,
        ingredient: ri.ingredient ?? null,
        quantity: ri.quantity
    })) ?? []
);

function addIngredient() {
    ingredients.value.push(blankRow());
}

function removeIngredient(index: number) {
    ingredients.value.splice(index, 1);
}

const totals = computed(() => {
    return ingredients.value.reduce(
        (acc, ri) => {
            if (!ri.ingredient || !ri.quantity) return acc;
            const f = ri.quantity / 100;
            return {
                calories: acc.calories + ri.ingredient.calories_per_100 * f,
                protein_g: acc.protein_g + ri.ingredient.protein_g_per_100 * f,
                carbs_g: acc.carbs_g + ri.ingredient.carbs_g_per_100 * f,
                fat_g: acc.fat_g + ri.ingredient.fat_g_per_100 * f
            };
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
});

async function save() {
    if (!name.value.trim()) return;
    saving.value = true;
    try {
        let recipeId: string;
        let imageUrl: string | null = props.recipe?.image_url ?? null;

        if (props.recipe) {
            recipeId = props.recipe.id;
        } else {
            const created = await RecipeApi.create(authStore.householdId!, name.value.trim(), type.value, notes.value || null);
            recipeId = created.id;
        }

        if (removeImageFlag.value) {
            await RecipeApi.deleteImage(recipeId);
            imageUrl = null;
        } else if (pendingImageFile.value) {
            imageUrl = await RecipeApi.uploadImage(recipeId, pendingImageFile.value);
        }

        await RecipeApi.update(recipeId, name.value.trim(), type.value, notes.value || null, imageUrl);

        const validIngredients = ingredients.value
            .filter((ri) => ri.ingredient_id && ri.quantity > 0)
            .map((ri) => ({ ingredient_id: ri.ingredient_id, quantity: ri.quantity }));
        await RecipeApi.upsertRecipeIngredients(recipeId, validIngredients);

        router.push({ name: 'Recipes' });
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="recipe-form">
        <div
            class="image-upload"
            :style="previewUrl ? { backgroundImage: `url(${previewUrl})` } : {}"
            @click="fileInput?.click()"
        >
            <span v-if="!previewUrl" class="image-placeholder">
                <i class="pi pi-image" />
                <span>Add photo</span>
            </span>
            <button v-if="previewUrl" class="remove-image" @click.stop="clearImage">
                <i class="pi pi-times" />
            </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />

        <div class="field">
            <label>Name *</label>
            <InputText v-model="name" placeholder="Recipe name" />
        </div>

        <div class="field">
            <label>Type *</label>
            <Select v-model="type" :options="typeOptions" optionLabel="label" optionValue="value" />
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
                <span>Ingredient</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>kcal</span>
                <span>P(g)</span>
                <span>C(g)</span>
                <span>F(g)</span>
                <span></span>
            </div>

            <RecipeIngredientRow
                v-for="(ing, idx) in ingredients"
                :key="ing._key"
                v-model="ingredients[idx]"
                @remove="removeIngredient(idx)"
            />

            <div v-if="ingredients.length" class="totals">
                <strong>Totals:</strong>
                {{ Math.round(totals.calories) }}kcal &nbsp;|&nbsp;
                P: {{ Math.round(totals.protein_g * 10) / 10 }}g &nbsp;|&nbsp;
                C: {{ Math.round(totals.carbs_g * 10) / 10 }}g &nbsp;|&nbsp;
                F: {{ Math.round(totals.fat_g * 10) / 10 }}g
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

.image-upload {
    height: 180px;
    border: 2px dashed #ddd;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;

    &:hover { border-color: #aaa; }
}

.image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #aaa;
    pointer-events: none;

    i { font-size: 2rem; }
}

.remove-image {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { background: rgba(0, 0, 0, 0.75); }
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
    display: grid;
    grid-template-columns: minmax(0, 2.5fr) minmax(0, 1fr) 0.6fr repeat(4, 0.8fr) auto;
    gap: 6px;
    font-size: 0.75em;
    color: #888;
    padding: 0 2px;
}

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

- [ ] **Step 3: Update RecipeCard.vue**

The `totalCalories` computed must derive from the new contract. Replace lines 8–10 (the computed):

```ts
const totalCalories = computed(() =>
    Math.round(
        (props.recipe.ingredients ?? []).reduce((s, ri) => {
            if (!ri.ingredient) return s;
            return s + (ri.quantity / 100) * ri.ingredient.calories_per_100;
        }, 0)
    )
);
```

- [ ] **Step 4: Delete IngredientRow.vue**

```bash
rm src/components/recipe/IngredientRow.vue
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 6: Manual test**

Start the dev server (`npm run dev`):

1. Navigate to Recipes → New recipe
2. Click "Add" under Ingredients
3. Type a name in the autocomplete — suggestions from the catalogue appear
4. Select an existing ingredient, enter a quantity — derived macros appear in the row and totals update
5. Type a name not in the catalogue, select "+ Create …" — dialog opens with the name prefilled, fill in macros, save — the new ingredient is selected in the row
6. Save the recipe — it should save without error and redirect to the recipes list
7. Open the recipe again — ingredients load correctly with quantities
8. Navigate to the Ingredients page — the new catalogue entry is visible

- [ ] **Step 7: Commit**

```bash
git add src/components/recipe/RecipeIngredientRow.vue src/components/recipe/RecipeForm.vue src/components/recipe/RecipeCard.vue
git rm src/components/recipe/IngredientRow.vue
git commit -m "feat: replace IngredientRow with RecipeIngredientRow using catalogue autocomplete"
```

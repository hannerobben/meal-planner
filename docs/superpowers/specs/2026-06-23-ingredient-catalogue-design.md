# Ingredient Catalogue — Design Spec

**Date:** 2026-06-23
**Status:** Approved

---

## Overview

Rework the ingredient model so that ingredients live in a household-scoped catalogue table with nutrition values stored per 100 units. Recipes reference catalogue entries via a `recipe_ingredients` junction table with a quantity field. Macros for a recipe are derived client-side: `(quantity / 100) * macros_per_100`. A new Ingredients page allows managing the catalogue directly; ingredients can also be created inline from the recipe form.

---

## Database

### Migration 13 — replace `ingredients` with catalogue

Drop the current `ingredients` table (no real data exists) and recreate it as the household-scoped catalogue.

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

### Migration 14 — `recipe_ingredients` junction

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

`on delete restrict` on `ingredient_id` prevents deleting a catalogue entry that is still referenced by any recipe. The UI must handle this gracefully with a toast error.

---

## TypeScript Contracts

### `ingredient.contract.ts` — catalogue entry

```ts
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

### `recipe-ingredient.contract.ts` — junction (new file)

```ts
export interface RecipeIngredientContract {
    id: string;
    recipe_id: string;
    ingredient_id: string;
    quantity: number;
    ingredient?: IngredientContract;
}
```

### `recipe.contract.ts`

`ingredients` field changes type from `IngredientContract[]` to `RecipeIngredientContract[]`.

---

## API Layer

### `src/supabase/ingredient.api.ts` (new)

| Method | Description |
|--------|-------------|
| `getAll(householdId)` | Fetch all catalogue entries for the household |
| `create(householdId, data)` | Insert a new catalogue entry |
| `update(id, data)` | Update name, category, base_unit, or macros |
| `remove(id)` | Delete — throws if still referenced in `recipe_ingredients` |

### `src/supabase/recipe.api.ts` (updated)

- `getAll` and `getById` select `*, recipe_ingredients(*, ingredient(*))` instead of `*, ingredients(*)`
- `upsertIngredients` is replaced by `upsertRecipeIngredients(recipeId, items: {ingredient_id: string, quantity: number}[])` — same delete-then-insert pattern

### `src/supabase/shopping.api.ts` (updated)

The shopping query joins through `recipe_ingredients → ingredients` instead of the old `ingredients` table.

---

## State

### `src/stores/ingredient.store.ts` (new)

Pinia store holding the household's ingredient catalogue. Loaded once on app start. Exposes the list for autocomplete and CRUD actions that call `IngredientApi`.

### `src/stores/recipe.store.ts` (updated)

`RecipeContract.ingredients` now typed as `RecipeIngredientContract[]`. Totals computation updated to derive macros: `(ri.quantity / 100) * ri.ingredient.macros_per_100`.

---

## UI

### Navigation

Bottom nav changes from 5 items to 4:

**Plan · Recipes · Ingredients · Shopping**

The Profile tab is removed. The profile page remains accessible by URL but has no nav entry.

Files to update: `AppFooterMenu.vue`, `AppTabMenu.vue`, `route.ts`.

### New page: `IngredientsPage.vue`

Route: `/ingredients`

Displays a list of all catalogue entries. Each row shows name, category, base unit, and macros per 100. Supports:
- **Inline edit** — tap a row to expand/edit fields in place
- **Delete** — button per row; blocked with a toast error if the ingredient is used in any recipe

### `RecipeForm.vue` + `RecipeIngredientRow.vue`

`IngredientRow.vue` is replaced by `RecipeIngredientRow.vue`. Each row has:
- **AutoComplete** — searches the household catalogue by name. If no match exists, shows an "Add new ingredient" option.
- **Quantity** — numeric input (unit label shown read-only next to it, sourced from the catalogue entry)
- **Derived macros** — read-only per-row summary: kcal, P, C, F (computed from quantity)
- **Remove** button

**Inline ingredient creation:** selecting "Add new ingredient" from the autocomplete opens a small dialog with fields for name, category, base unit, and per-100 macros. On save, the entry is created in the catalogue and immediately selected in the row.

The totals footer in `RecipeForm.vue` remains but derives values via `(quantity / 100) * macros_per_100` instead of reading stored values.

---

## Macro Derivation Formula

```
kcal  = (quantity / 100) × calories_per_100
P (g) = (quantity / 100) × protein_g_per_100
C (g) = (quantity / 100) × carbs_g_per_100
F (g) = (quantity / 100) × fat_g_per_100
```

Applied client-side in `RecipeIngredientRow` and the `RecipeForm` totals.

---

## Files Changed / Added

| File | Change |
|------|--------|
| `supabase/migrations/20260623000013_rework_ingredients.sql` | New |
| `supabase/migrations/20260623000014_create_recipe_ingredients.sql` | New |
| `src/model/ingredient.contract.ts` | Updated (catalogue shape) |
| `src/model/recipe-ingredient.contract.ts` | New |
| `src/model/recipe.contract.ts` | Updated (`ingredients` field type) |
| `src/supabase/ingredient.api.ts` | New |
| `src/supabase/recipe.api.ts` | Updated (select + upsert) |
| `src/supabase/shopping.api.ts` | Updated (join path) |
| `src/stores/ingredient.store.ts` | New |
| `src/stores/recipe.store.ts` | Updated (totals derivation) |
| `src/pages/IngredientsPage.vue` | New |
| `src/components/recipe/RecipeIngredientRow.vue` | New (replaces IngredientRow) |
| `src/components/recipe/RecipeForm.vue` | Updated |
| `src/components/recipe/IngredientRow.vue` | Deleted |
| `src/router/route.ts` | Add `/ingredients` route |
| `src/components/AppFooterMenu.vue` | Update nav tabs |
| `src/components/AppTabMenu.vue` | Update nav tabs |

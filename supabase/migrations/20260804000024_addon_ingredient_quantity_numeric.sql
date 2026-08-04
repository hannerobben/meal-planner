alter table public.meal_plan_entry_addon_ingredients
    alter column quantity type numeric using quantity::numeric;

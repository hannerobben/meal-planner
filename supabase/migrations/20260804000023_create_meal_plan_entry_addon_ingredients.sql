create table public.meal_plan_entry_addon_ingredients (
    id                  uuid primary key default gen_random_uuid(),
    meal_plan_entry_id  uuid not null references public.meal_plan_entries(id) on delete cascade,
    ingredient_id       uuid not null references public.ingredients(id) on delete restrict,
    quantity            integer not null
);

alter table public.meal_plan_entry_addon_ingredients enable row level security;

create policy "meal_plan_entry_addon_ingredients via owned meal plan entry"
    on public.meal_plan_entry_addon_ingredients
    for all
    using (
        meal_plan_entry_id in (
            select id from public.meal_plan_entries
            where household_id = public.get_my_household_id()
        )
    )
    with check (
        meal_plan_entry_id in (
            select id from public.meal_plan_entries
            where household_id = public.get_my_household_id()
        )
    );

grant select, insert, update, delete on public.meal_plan_entry_addon_ingredients to authenticated;
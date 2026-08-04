create table public.meal_plan_entry_addon_recipes (
    id                  uuid primary key default gen_random_uuid(),
    meal_plan_entry_id  uuid not null references public.meal_plan_entries(id) on delete cascade,
    recipe_id           uuid not null references public.recipes(id) on delete restrict
);

alter table public.meal_plan_entry_addon_recipes enable row level security;

create policy "meal_plan_entry_addon_recipes via owned meal plan entry"
    on public.meal_plan_entry_addon_recipes
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

grant select, insert, update, delete on public.meal_plan_entry_addon_recipes to authenticated;

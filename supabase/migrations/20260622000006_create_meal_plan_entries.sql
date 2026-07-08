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
    using (household_id = public.get_my_household_id())
    with check (household_id = public.get_my_household_id());

grant select, insert, update, delete on public.meal_plan_entries to authenticated;
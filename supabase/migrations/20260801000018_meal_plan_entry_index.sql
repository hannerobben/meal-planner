alter table public.meal_plan_entries
    add column slot_index smallint not null default 0;

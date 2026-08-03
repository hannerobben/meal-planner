alter table public.meal_plan_entries
    add column user_id uuid references public.users(id) on delete set null;
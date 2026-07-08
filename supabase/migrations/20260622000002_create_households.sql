create table public.households (
    id         uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

alter table public.households enable row level security;

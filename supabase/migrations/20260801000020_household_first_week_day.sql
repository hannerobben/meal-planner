alter table public.households
    add column first_week_day smallint not null default 1
        constraint first_week_day_range check (first_week_day between 0 and 6);

update public.households set first_week_day = 6;

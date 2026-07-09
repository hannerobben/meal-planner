alter table public.users
    add column weight_kg      numeric,
    add column height_cm      numeric,
    add column age            integer,
    add column sex            text check (sex in ('male', 'female')),
    add column activity_level text check (activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'super_active')),
    add column protein_per_kg numeric default 1.8,
    add column fat_loss_goal  text check (fat_loss_goal in ('maintenance', 'mild_loss', 'moderate_loss')) default 'maintenance';

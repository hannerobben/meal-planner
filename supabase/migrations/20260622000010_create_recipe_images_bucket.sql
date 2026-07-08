insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true);

create policy "recipe images select"
    on storage.objects for select
    using (bucket_id = 'recipe-images');

create policy "recipe images insert"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'recipe-images'
        and owner_id = auth.uid()::text
    );

create policy "recipe images update"
    on storage.objects for update to authenticated
    using (bucket_id = 'recipe-images' and owner_id = auth.uid()::text)
    with check (bucket_id = 'recipe-images' and owner_id = auth.uid()::text);

create policy "recipe images delete"
    on storage.objects for delete to authenticated
    using (bucket_id = 'recipe-images' and owner_id = auth.uid()::text);
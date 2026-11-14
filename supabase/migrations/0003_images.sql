-- Stockage des images des items (ADR-02, ADR-05).
-- Bucket public : les vignettes s'affichent par simple URL, avec des chemins impossibles à deviner
-- ({user_id}/{collection_id}/{item_id}.webp). Seule l'écriture est protégée.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('items', 'items', true, 524288, array['image/webp'])  -- vignettes WebP de 512 Ko au plus
on conflict (id) do nothing;

-- Chacun n'écrit, ne remplace et ne supprime que dans son propre dossier ({user_id}/…).
create policy "images : lecture de son dossier"
  on storage.objects for select to authenticated
  using (bucket_id = 'items' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "images : ajout dans son dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'items' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "images : remplacement dans son dossier"
  on storage.objects for update to authenticated
  using (bucket_id = 'items' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'items' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "images : suppression dans son dossier"
  on storage.objects for delete to authenticated
  using (bucket_id = 'items' and (storage.foldername(name))[1] = (select auth.uid())::text);

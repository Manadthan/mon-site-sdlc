-- Tests du stockage des images (pgTAP) : bucket public, écriture limitée à son propre dossier.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.fr');

select ok((select public from storage.buckets where id = 'items'), 'le bucket items est public (lecture par URL)');
select is(
  (select allowed_mime_types from storage.buckets where id = 'items'),
  array['image/webp'],
  'seules les vignettes WebP sont acceptées'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('items', '00000000-0000-0000-0000-00000000000a/c/i.webp')$$,
  'Alice écrit dans son dossier'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('items', '00000000-0000-0000-0000-00000000000b/c/i.webp')$$,
  '42501', null, 'Alice ne peut pas écrire dans le dossier de Bruno'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
-- (La suppression directe en SQL est interdite par Supabase : elle est testée de bout en bout, via l'API, en e2e.)
select is_empty(
  $$update storage.objects set name = '00000000-0000-0000-0000-00000000000b/vol.webp'
    where name = '00000000-0000-0000-0000-00000000000a/c/i.webp' returning name$$,
  'Bruno ne peut ni voir ni modifier une image d''Alice'
);

select * from finish();
rollback;

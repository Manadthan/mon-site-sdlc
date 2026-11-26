-- Tests des collections liées à une source externe (migration 0009).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$insert into public.collections (id, name, external_url, external_source, external_owned, external_total, external_cover_url, external_synced_at)
    values (
      '10000000-0000-0000-0000-000000000010',
      'Wii U · Europe',
      'https://nintendo-db.vercel.app/?console=wii-u&marche=pal',
      'nintendo-db',
      14,
      42,
      'https://exemple.supabase.co/storage/v1/object/public/jaquettes/1-300.webp',
      now()
    )$$,
  'une collection liée valide est acceptée'
);

select throws_ok(
  $$insert into public.collections (name, external_url) values ('X', 'javascript:alert(1)')$$,
  '23514', null, 'une URL externe non http(s) est refusée'
);
select throws_ok(
  $$insert into public.collections (name, external_cover_url) values ('X', 'ftp://exemple.fr/a.webp')$$,
  '23514', null, 'une couverture externe non http(s) est refusée'
);
select throws_ok(
  $$insert into public.collections (name, external_owned) values ('X', -1)$$,
  '23514', null, 'external_owned négatif est refusé'
);
select throws_ok(
  $$insert into public.collections (name, external_total) values ('X', -5)$$,
  '23514', null, 'external_total négatif est refusé'
);

-- Vue collection_stats : la collection liée lit ses compteurs externes.
select is(
  (select owned from public.collection_stats where collection_id = '10000000-0000-0000-0000-000000000010'),
  14,
  'collection_stats renvoie external_owned pour une collection liée'
);
select is(
  (select total from public.collection_stats where collection_id = '10000000-0000-0000-0000-000000000010'),
  42,
  'collection_stats renvoie external_total pour une collection liée'
);
select is(
  (select percent from public.collection_stats where collection_id = '10000000-0000-0000-0000-000000000010'),
  33,
  'collection_stats calcule percent depuis external_owned / external_total'
);

-- Une collection locale garde son calcul sur la table items.
insert into public.collections (id, name) values ('10000000-0000-0000-0000-000000000020', 'Locale');
insert into public.items (collection_id, title, position, owned) values
  ('10000000-0000-0000-0000-000000000020', 'Item 1', 1, true),
  ('10000000-0000-0000-0000-000000000020', 'Item 2', 2, false);
select is(
  (select percent from public.collection_stats where collection_id = '10000000-0000-0000-0000-000000000020'),
  50,
  'collection_stats conserve le calcul sur items pour les collections locales'
);

-- La liste partagée (US-17) expose external_url, external_source et external_cover_url.
insert into public.partages (token) values ('jeton-alice-0123456789abcdefghijklmnopqrstu');
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is(
  (select jsonb_build_object(
      'external_url', e ->> 'external_url',
      'external_source', e ->> 'external_source',
      'external_cover_url', e ->> 'external_cover_url',
      'owned', (e -> 'owned')::int,
      'total', (e -> 'total')::int
    )
    from jsonb_array_elements(public.shared_collections('jeton-alice-0123456789abcdefghijklmnopqrstu')) e
    where e ->> 'id' = '10000000-0000-0000-0000-000000000010'),
  jsonb_build_object(
    'external_url', 'https://nintendo-db.vercel.app/?console=wii-u&marche=pal',
    'external_source', 'nintendo-db',
    'external_cover_url', 'https://exemple.supabase.co/storage/v1/object/public/jaquettes/1-300.webp',
    'owned', 14,
    'total', 42
  ),
  'shared_collections expose les métadonnées et compteurs des collections liées'
);

select * from finish();
rollback;

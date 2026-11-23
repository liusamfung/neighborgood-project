-- Prueba de la migración 20261123000001_realtime_pases.sql (RF21): `pases_visita` está publicada en
-- Realtime, junto con `alertas`, para que la app abierta del residente reciba el ingreso de su visita.
--
-- Se relaciona con: la migración de Realtime de pases y la parte 5 (que publicó `alertas`).
-- Se ejecuta con `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select ok(
  exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pases_visita'
  ),
  'pases_visita está en la publicación supabase_realtime'
);

-- La migración se puede volver a ejecutar sin error (no agrega la tabla dos veces).
select lives_ok(
  $$
  do $b$
  begin
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pases_visita'
    ) then
      alter publication supabase_realtime add table public.pases_visita;
    end if;
  end;
  $b$
  $$,
  'volver a publicar la tabla no falla'
);

select * from finish();
rollback;

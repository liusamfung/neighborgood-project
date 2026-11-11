-- Pruebas de la creación de pases (RF15, RF16): lo que ocurre en la base cuando la Edge Function `crear-pase`
-- inserta con la service_role. Comprueban que Postgres fija el estado y el código del pase (UUID v4), que
-- el pase queda asociado a la unidad del residente, que cada pase tiene un código distinto y que nadie más
-- (anon, el propio residente) puede insertar pases ni verlos si no son suyos. Usan los datos de seed.sql.
-- Usuarios del seed: residente1 90..11 y residente2 90..12 (unidad A-101), residente3 90..13 (unidad B-101).
--
-- Se relaciona con: la migración 1 (tabla pases_visita y sus valores por defecto), la 2 (CHECK de estado),
-- la 5 (GRANT y RLS) y `supabase/functions/crear-pase`, que hace estas mismas inserciones.
-- Los ayudantes tests.como* son los mismos de 03 a 07.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Ayudantes de prueba: tests.como(uid) actúa como ese usuario autenticado (rol authenticated con su id en
-- el JWT) y tests.como_postgres() vuelve al administrador. Así se prueba RLS sin pasar por la API.
create schema tests;
grant usage on schema tests to public;
create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  set local role authenticated;
end $$;
create function tests.como_postgres() returns void language plpgsql as $$ begin reset role; end $$;

select is((select count(*)::int from public.pases_visita), 1, 'El seed trae un solo pase');

-- ───────────── La Edge Function inserta con la service_role (RF15) ─────────────
-- Solo manda residente, unidad, nombre, fecha y hora: el resto lo fija la base de datos.
select tests.como_postgres();
set local role service_role;
select lives_ok($$ insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, hora_estimada)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Carlos Pérez', '2030-01-15', '18:30') $$,
  'La service_role crea un pase con los datos que manda la función');
select lives_ok($$ insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, hora_estimada)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Ana Ruiz', '2030-01-15', '19:00') $$,
  'Se puede crear un segundo pase para el mismo día');
select tests.como_postgres();

select is((select estado::text from public.pases_visita where nombre_visitante = 'Carlos Pérez'), 'vigente',
  'El pase nace vigente (lo fija la base, no la función)');
select is((select unidad_id from public.pases_visita where nombre_visitante = 'Carlos Pérez'),
  '20000000-0000-0000-0000-000000000001'::uuid, 'El pase queda asociado a la unidad del residente');
select is((select residente_id from public.pases_visita where nombre_visitante = 'Carlos Pérez'),
  '90000000-0000-0000-0000-000000000011'::uuid, 'El pase queda a nombre del residente');
select is((select hora_estimada::text from public.pases_visita where nombre_visitante = 'Carlos Pérez'), '18:30:00',
  'Se guarda la hora estimada');
select ok((select creado_en is not null and guardia_id is null and ingreso_en is null and salida_en is null and anulado_en is null
             from public.pases_visita where nombre_visitante = 'Carlos Pérez'),
  'Un pase nuevo no tiene guardia, ingreso, salida ni anulación');

-- ───────────── El código del pase es un UUID v4 de Postgres (RF16, RNF3) ─────────────
-- La versión 4 es el dígito 15 del texto; la variante RFC 4122 (8, 9, a o b) es el dígito 20.
select ok((select substr(id::text, 15, 1) = '4' and substr(id::text, 20, 1) in ('8', '9', 'a', 'b')
             from public.pases_visita where nombre_visitante = 'Carlos Pérez'),
  'El código del pase es un UUID v4');
select is((select count(distinct id)::int from public.pases_visita), 3,
  'Cada pase tiene un código distinto');

-- ───────────── Quién puede insertar y quién ve cada pase ─────────────
select tests.como_postgres();
set local role anon;
select throws_ok($$ insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Sin sesión', '2030-01-15') $$,
  '42501', null, 'Sin sesión (anon) no se crean pases');

select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Directo', '2030-01-15') $$,
  '42501', null, 'El residente no inserta pases por su cuenta: solo la función los crea');
select is((select count(*)::int from public.pases_visita), 3, 'El residente ve sus tres pases');

select tests.como('90000000-0000-0000-0000-000000000012');
select is((select count(*)::int from public.pases_visita), 0,
  'Un vecino de la misma unidad no ve los pases de otro residente');
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.pases_visita), 0, 'Un residente de otra unidad no ve esos pases');

-- ───────────── La base protege el estado del pase ─────────────
select tests.como_postgres();
set local role service_role;
select throws_ok($$ insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, estado)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Ya usado', '2030-01-15', 'usado') $$,
  '23514', null, 'Un pase usado exige ingreso y guardia: no se puede crear ya usado');
select tests.como_postgres();

select * from finish();
rollback;

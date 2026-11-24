-- Pruebas de la migración 12 (rendimiento de las políticas de lectura, RNF5): las cuatro políticas llaman a
-- sus funciones de rol dentro de una subconsulta (así Postgres las evalúa una sola vez por consulta y no una
-- por fila) y, sobre todo, QUIÉN VE QUÉ no cambió: el guardia solo ve los pases de hoy, el residente solo lo
-- suyo (y las alertas de su sector), la directiva todo. Crean sus propias filas dentro de la transacción (se
-- deshacen al final) y usan los datos de seed.sql. Usuarios del seed: directiva 90..01, guardia 90..02,
-- residente1 90..11 y residente2 90..12 (los dos de la unidad A-101, Torre A) y residente3 90..13 (unidad
-- B-101, Torre B).
--
-- Se relaciona con: la migración 12 (lo que se prueba), la 5 (las políticas originales, que 04 prueba a fondo)
-- y `supabase/carga/` (la prueba de carga que encontró el problema). Los ayudantes tests.como* son los mismos
-- de 03 a 13.
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

-- ───────────── Estructura: el patrón de las políticas ─────────────
-- pg_policies muestra la subconsulta como "( SELECT privado.es_directiva() AS es_directiva)": si alguien
-- vuelve a escribir la llamada suelta, esta prueba falla y evita que regrese la lentitud.
select ok((select qual from pg_policies where tablename = 'pases_visita' and policyname = 'pases_visita: lectura')
            ~* 'select privado\.es_directiva', 'pases_visita: lectura evalúa es_directiva una sola vez');
select ok((select qual from pg_policies where tablename = 'alertas' and policyname = 'alertas: lectura')
            ~* 'select privado\.es_personal', 'alertas: lectura evalúa es_personal una sola vez');
select ok((select qual from pg_policies where tablename = 'alerta_atenciones' and policyname = 'alerta_atenciones: lectura')
            ~* 'select privado\.es_personal', 'alerta_atenciones: lectura evalúa es_personal una sola vez');
select ok((select qual from pg_policies where tablename = 'incidencias' and policyname = 'incidencias: lectura')
            ~* 'select privado\.es_directiva', 'incidencias: lectura evalúa es_directiva una sola vez');

-- ───────────── Datos de la prueba (como administrador) ─────────────
-- Pases: residente1 tiene uno de hoy y uno de ayer; residente2 (misma unidad) tiene uno de hoy.
insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita) values
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'T14 hoy res1',  privado.hoy_lima()),
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'T14 ayer res1', privado.hoy_lima() - 1),
  ('90000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 'T14 hoy res2',  privado.hoy_lima());
-- Alertas: una de residente1 (Torre A) y una de residente3 (Torre B).
insert into public.alertas (emisor_id, unidad_id, sector_id, tipo) values
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'medica'),
  ('90000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'incendio');
-- Incidencias: una de residente1 y una de residente3.
insert into public.incidencias (reportado_por, unidad_id, ubicacion, descripcion) values
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'T14 ubic res1', 'T14 incidencia res1'),
  ('90000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000005', 'T14 ubic res3', 'T14 incidencia res3');

-- ───────────── Pases: quién ve qué ─────────────
select tests.como('90000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.pases_visita where nombre_visitante like 'T14%'), 2,
  'El guardia ve solo los pases de hoy (2 de 3)');
select is((select count(*)::int from public.pases_visita where nombre_visitante = 'T14 ayer res1'), 0,
  'El guardia no ve el pase de ayer');

select tests.como('90000000-0000-0000-0000-000000000011');
select is((select count(*)::int from public.pases_visita where nombre_visitante like 'T14%'), 2,
  'El residente ve solo sus pases (hoy y ayer)');
select is((select count(*)::int from public.pases_visita where nombre_visitante = 'T14 hoy res2'), 0,
  'El residente no ve el pase de otro residente, aunque sea de su misma unidad');

select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.pases_visita where nombre_visitante like 'T14%'), 3,
  'La directiva ve todos los pases');

-- ───────────── Alertas: quién ve qué ─────────────
select tests.como('90000000-0000-0000-0000-000000000012');
select is((select count(*)::int from public.alertas where emisor_id = '90000000-0000-0000-0000-000000000011'), 1,
  'Un vecino de la misma torre ve la alerta de residente1 (RF25)');
select is((select count(*)::int from public.alertas where emisor_id = '90000000-0000-0000-0000-000000000013'), 0,
  'Un vecino de otra torre no ve la alerta de residente3');

select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.alertas where emisor_id = '90000000-0000-0000-0000-000000000013'), 1,
  'El emisor ve su propia alerta');

select tests.como('90000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.alertas
           where emisor_id in ('90000000-0000-0000-0000-000000000011', '90000000-0000-0000-0000-000000000013')), 2,
  'El guardia ve las alertas de todos los sectores');

-- ───────────── Incidencias: quién ve qué ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select is((select count(*)::int from public.incidencias where ubicacion like 'T14%'), 1,
  'El residente ve solo su incidencia');

select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.incidencias where ubicacion like 'T14%'), 2,
  'La directiva ve todas las incidencias');

select tests.como('90000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.incidencias where ubicacion like 'T14%'), 0,
  'El guardia no ve incidencias');

select tests.como_postgres();
select * from finish();
rollback;

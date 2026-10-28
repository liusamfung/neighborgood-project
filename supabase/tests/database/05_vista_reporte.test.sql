-- Pruebas de la vista reporte_incidencias_mensual: meses en la zona America/Lima y permisos.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

create schema tests;
grant usage on schema tests to public;
create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  set local role authenticated;
end $$;
create function tests.como_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
end $$;
create function tests.como_postgres() returns void language plpgsql as $$ begin reset role; end $$;
grant execute on all functions in schema tests to public;

-- Febrero y marzo de 2026. Las 22:00 del 28/02 en Lima son las 03:00 del 01/03 en UTC:
-- la incidencia debe contarse en febrero, no en marzo.
insert into public.incidencias (reportado_por, unidad_id, ubicacion, descripcion, estado, creada_en, resuelta_en) values
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'A-101', 'Cuenta en febrero (Lima)', 'pendiente', '2026-02-28 22:00:00-05', null),
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'A-101', 'Marzo pendiente',          'pendiente', '2026-03-01 00:30:00-05', null),
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'A-101', 'Marzo resuelta',           'resuelto',  '2026-03-15 12:00:00-05', '2026-03-16 09:00:00-05'),
  ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'A-101', 'Marzo en atención',        'en_atencion', '2026-03-20 08:00:00-05', null);

select tests.como('90000000-0000-0000-0000-000000000001');  -- directiva
select is((select total from public.reporte_incidencias_mensual where mes = '2026-02-01'), 1::bigint,
  'La incidencia de las 22:00 del 28/02 en Lima se cuenta en febrero');
select is((select total from public.reporte_incidencias_mensual where mes = '2026-03-01'), 3::bigint,
  'Marzo tiene 3 incidencias');
select is((select pendientes || '/' || en_atencion || '/' || resueltas from public.reporte_incidencias_mensual where mes = '2026-03-01'),
  '1/1/1', 'Marzo: 1 pendiente, 1 en atención y 1 resuelta');
select is((select pg_typeof(mes)::text from public.reporte_incidencias_mensual limit 1), 'date', 'La columna mes es una fecha');
select ok((select count(*) from public.reporte_incidencias_mensual) >= 3,
  'Hay una fila por mes con incidencias (febrero, marzo y el mes de los datos de prueba)');

select tests.como('90000000-0000-0000-0000-000000000013');  -- residente de otra unidad
select is((select count(*)::int from public.reporte_incidencias_mensual), 0,
  'La vista respeta RLS: un residente no ve las incidencias de otros');

select tests.como('90000000-0000-0000-0000-000000000011');  -- dueño de esas incidencias
select is((select total from public.reporte_incidencias_mensual where mes = '2026-03-01'), 3::bigint,
  'Un residente ve solo lo suyo (aquí, sus 3 incidencias de marzo)');

select tests.como_anon();
select throws_ok($$ select * from public.reporte_incidencias_mensual $$, '42501', null,
  'Sin sesión no se puede consultar la vista');

select tests.como_postgres();
select * from finish();
rollback;

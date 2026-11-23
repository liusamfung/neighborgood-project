-- Pruebas de la función crear_incidencia y de los permisos de inserción por columna (RF29): crea la
-- incidencia `pendiente` con su unidad y sus 1 a 3 fotos en una sola transacción, rechaza lo inválido sin
-- dejar ninguna fila, solo la usa un residente, y un residente ya no puede insertar el estado ni el
-- responsable. Usan los datos de seed.sql. Usuarios del seed: directiva 90..01, guardia 90..02,
-- residente1 90..11 y residente2 90..12 (los dos en la unidad A-101) y residente3 90..13 (unidad B-101).
--
-- Se relaciona con: la migración 10 (la función y los permisos que se prueban), la 2 (CHECK de 3 fotos) y
-- la 5 (RLS). Los ayudantes tests.como* son los mismos de 03 a 07.
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

-- ───────────── Permisos de ejecución y de columnas ─────────────
select ok(not has_function_privilege('anon', 'public.crear_incidencia(uuid,text,text,text[])', 'execute'),
  'anon no puede ejecutar crear_incidencia');
select ok(has_function_privilege('authenticated', 'public.crear_incidencia(uuid,text,text,text[])', 'execute'),
  'authenticated sí puede ejecutar crear_incidencia');
select ok(not has_column_privilege('authenticated', 'public.incidencias', 'estado', 'insert'),
  'authenticated no puede insertar el estado de una incidencia');
select ok(not has_column_privilege('authenticated', 'public.incidencias', 'atendido_por', 'insert'),
  'authenticated no puede insertar el responsable de una incidencia');
select ok(has_column_privilege('authenticated', 'public.incidencias', 'descripcion', 'insert'),
  'authenticated sí puede insertar la descripción de una incidencia');

-- ───────────── El residente reporta con 1 foto (RF29) ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ select public.crear_incidencia(
    'a0000000-0000-0000-0000-000000000001', '  Pasillo del piso 3 ', ' Desde el lunes no enciende la luz. ',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000001/1.jpg']) $$,
  'El residente reporta una incidencia con una foto');

select tests.como_postgres();
select is((select estado::text from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  'pendiente', 'La incidencia nace en estado pendiente');
select is((select unidad_id from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  '20000000-0000-0000-0000-000000000001'::uuid, 'La incidencia queda con la unidad del residente');
select is((select reportado_por from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  '90000000-0000-0000-0000-000000000011'::uuid, 'Reporta quien llama');
select is((select ubicacion from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  'Pasillo del piso 3', 'La ubicación se guarda sin espacios sobrantes');
select is((select descripcion from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  'Desde el lunes no enciende la luz.', 'La descripción se guarda sin espacios sobrantes');
select ok((select atendido_por is null and resuelta_en is null
             from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  'Una incidencia nueva no tiene responsable ni fecha de resolución');
select ok((select creada_en > now() - interval '1 minute'
             from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'),
  'La hora de creación la fija la base');
select is((select count(*)::int from public.incidencia_fotos where incidencia_id = 'a0000000-0000-0000-0000-000000000001'),
  1, 'Se guarda la foto');

-- ───────────── Con 3 fotos: el orden sigue la posición en la lista ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ select public.crear_incidencia(
    'a0000000-0000-0000-0000-000000000002', 'Dpto A-101', 'Gotera en el techo del baño.',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000002/1.jpg',
          '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000002/2.png',
          '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000002/3.webp']) $$,
  'El residente reporta una incidencia con tres fotos');
select tests.como_postgres();
select is((select array_agg(orden order by orden) from public.incidencia_fotos
            where incidencia_id = 'a0000000-0000-0000-0000-000000000002'), array[1, 2, 3]::smallint[],
  'Las tres fotos quedan con orden 1, 2 y 3');
select is((select foto_path from public.incidencia_fotos
            where incidencia_id = 'a0000000-0000-0000-0000-000000000002' and orden = 2),
  '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000002/2.png',
  'La foto 2 es la segunda de la lista');

-- ───────────── Lo inválido se rechaza y no deja ninguna fila ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000010', 'Dpto', 'Texto',
    array[]::text[]) $$, '22023', null, 'Sin fotos se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000011', 'Dpto', 'Texto',
    null) $$, '22023', null, 'Con las fotos en NULL se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000012', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000012/1.jpg',
          '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000012/2.jpg',
          '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000012/3.jpg',
          '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000012/4.jpg']) $$,
  '22023', null, 'Con cuatro fotos se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000013', '   ', 'Texto',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000013/1.jpg']) $$,
  '22023', null, 'Con la ubicación en blanco se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000014', 'Dpto', '   ',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000014/1.jpg']) $$,
  '22023', null, 'Con la descripción en blanco se rechaza');
select throws_ok($$ select public.crear_incidencia(null, 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000015/1.jpg']) $$,
  '22023', null, 'Sin identificador se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000016', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000012/a0000000-0000-0000-0000-000000000016/1.jpg']) $$,
  '22023', null, 'Una foto en la carpeta de otro usuario se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000017', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000099/1.jpg']) $$,
  '22023', null, 'Una foto de la carpeta de otra incidencia se rechaza');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000018', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000018/1.jpg',
          '90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000018/1.jpg']) $$,
  '22023', null, 'Una foto repetida se rechaza');

-- Un id que ya existe no se puede reutilizar.
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000001', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000011/a0000000-0000-0000-0000-000000000001/1.jpg']) $$,
  '23505', null, 'No se puede crear otra incidencia con un id ya usado');

select tests.como_postgres();
select is((select count(*)::int from public.incidencias
            where id between 'a0000000-0000-0000-0000-000000000010' and 'a0000000-0000-0000-0000-000000000018'),
  0, 'Ninguna incidencia rechazada dejó una fila');
select is((select count(*)::int from public.incidencia_fotos
            where incidencia_id between 'a0000000-0000-0000-0000-000000000010' and 'a0000000-0000-0000-0000-000000000018'),
  0, 'Ninguna incidencia rechazada dejó fotos');
select is((select count(*)::int from public.incidencia_fotos where incidencia_id = 'a0000000-0000-0000-0000-000000000001'),
  1, 'El intento de repetir un id no tocó las fotos de la incidencia original');

-- ───────────── Solo un residente reporta ─────────────
select tests.como('90000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000020', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000002/a0000000-0000-0000-0000-000000000020/1.jpg']) $$,
  '42501', null, 'Un guardia no puede reportar incidencias');
select tests.como('90000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.crear_incidencia('a0000000-0000-0000-0000-000000000021', 'Dpto', 'Texto',
    array['90000000-0000-0000-0000-000000000001/a0000000-0000-0000-0000-000000000021/1.jpg']) $$,
  '42501', null, 'La directiva no puede reportar incidencias');

-- ───────────── El residente ya no puede fijar el estado ni el responsable al insertar ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ insert into public.incidencias (reportado_por, unidad_id, ubicacion, descripcion, estado)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Dpto', 'Texto',
            'resuelto') $$,
  '42501', null, 'Un residente no puede insertar una incidencia ya resuelta');
select throws_ok($$ insert into public.incidencias (reportado_por, unidad_id, ubicacion, descripcion, atendido_por)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Dpto', 'Texto',
            '90000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Un residente no puede inventar el responsable de su incidencia');
-- La incidencia del seed (80..01) es de residente1; residente3 es de otra unidad y no puede adjuntarle fotos.
select tests.como('90000000-0000-0000-0000-000000000013');
select throws_ok($$ insert into public.incidencia_fotos (incidencia_id, foto_path, orden)
    values ('80000000-0000-0000-0000-000000000001', 'x/y/1.jpg', 2) $$,
  '42501', null, 'Un residente no agrega fotos a la incidencia de otra persona');

-- ───────────── Quién ve la incidencia ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select is((select count(*)::int from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'), 1,
  'El residente ve su incidencia');
select tests.como('90000000-0000-0000-0000-000000000012');
select is((select count(*)::int from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'), 0,
  'Otro residente de la misma unidad no la ve');
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'), 0,
  'Un residente de otra unidad no la ve');
select is((select count(*)::int from public.incidencia_fotos where incidencia_id = 'a0000000-0000-0000-0000-000000000001'),
  0, 'Un residente ajeno tampoco ve sus fotos');
select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.incidencias where id = 'a0000000-0000-0000-0000-000000000001'), 1,
  'La directiva ve la incidencia');
select is((select count(*)::int from public.incidencia_fotos where incidencia_id = 'a0000000-0000-0000-0000-000000000001'),
  1, 'La directiva ve sus fotos');

select tests.como_postgres();
select * from finish();
rollback;

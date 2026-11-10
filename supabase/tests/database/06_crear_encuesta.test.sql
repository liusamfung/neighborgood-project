-- Pruebas de la función crear_encuesta (RF8, RF13, RF14): guarda la encuesta completa en orden, solo
-- la directiva puede usarla y, si algo falla, no queda ninguna fila. Usan los datos de seed.sql.
-- Usuarios del seed: directiva 90..01, guardia 90..02, residente 90..11.
--
-- Se relaciona con: la migración 7 (la función que se prueba), la 2 (CHECK de fechas) y la 5 (RLS).
-- Los ayudantes tests.como* son los mismos de 03, 04 y 05.
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

-- ───────────── Permisos de ejecución ─────────────
select ok(not has_function_privilege('anon',
  'public.crear_encuesta(text,text,uuid,public.prioridad_encuesta,boolean,timestamptz,timestamptz,uuid[],jsonb)',
  'execute'), 'anon no puede ejecutar crear_encuesta');

-- ───────────── La directiva crea una encuesta completa (RF8, RF13, RF14) ─────────────
select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.crear_encuesta(
    p_titulo => 'Color de la fachada', p_descripcion => 'Elige el color',
    p_categoria_id => '40000000-0000-0000-0000-000000000005', p_prioridad => 'alta',
    p_resultados_en_vivo => true, p_abre_en => now(), p_cierra_en => now() + interval '7 days',
    p_sectores => array['10000000-0000-0000-0000-000000000001']::uuid[],
    p_preguntas => '[{"texto":"¿Qué color?","seleccion":"unica","opciones":["Blanco","Beige","Gris"]},
                     {"texto":"¿Qué extras?","seleccion":"multiple","opciones":["Reja","Luces"]}]'::jsonb) $$,
  'La directiva crea una encuesta con dos preguntas');

select is((select count(*)::int from public.encuestas where titulo = 'Color de la fachada'), 1,
  'Se guarda la encuesta');
select is((select prioridad::text from public.encuestas where titulo = 'Color de la fachada'), 'alta',
  'Prioridad alta = obligatoria (RF14)');
select is((select autor_id from public.encuestas where titulo = 'Color de la fachada'),
  '90000000-0000-0000-0000-000000000001'::uuid, 'El autor es quien la crea');
select is((select para_todos from public.encuestas where titulo = 'Color de la fachada'), false,
  'Con sectores, para_todos es false (RF13)');
select is((select count(*)::int from public.encuesta_sectores s
             join public.encuestas e on e.id = s.encuesta_id
            where e.titulo = 'Color de la fachada'
              and s.sector_id = '10000000-0000-0000-0000-000000000001'), 1,
  'Se guarda el sector destino');
select is((select array_agg(q.texto order by q.orden) from public.encuesta_preguntas q
             join public.encuestas e on e.id = q.encuesta_id where e.titulo = 'Color de la fachada'),
  array['¿Qué color?', '¿Qué extras?'], 'Las preguntas quedan en su orden');
select is((select array_agg(q.seleccion::text order by q.orden) from public.encuesta_preguntas q
             join public.encuestas e on e.id = q.encuesta_id where e.titulo = 'Color de la fachada'),
  array['unica', 'multiple'], 'Cada pregunta guarda su tipo de selección');
select is((select array_agg(o.texto order by o.orden) from public.encuesta_opciones o
             join public.encuesta_preguntas q on q.id = o.pregunta_id
             join public.encuestas e on e.id = q.encuesta_id
            where e.titulo = 'Color de la fachada' and q.orden = 1),
  array['Blanco', 'Beige', 'Gris'], 'Las opciones quedan en su orden');
select is((select array_agg(o.orden order by o.orden) from public.encuesta_opciones o
             join public.encuesta_preguntas q on q.id = o.pregunta_id
             join public.encuestas e on e.id = q.encuesta_id
            where e.titulo = 'Color de la fachada' and q.orden = 1),
  array[1, 2, 3]::smallint[], 'El orden de las opciones empieza en 1');

-- Sin sectores la encuesta es para todo el condominio y los valores opcionales toman su valor por defecto.
select lives_ok($$ select public.crear_encuesta(
    p_titulo => 'Reunión anual', p_descripcion => null,
    p_categoria_id => '40000000-0000-0000-0000-000000000005', p_prioridad => 'normal',
    p_resultados_en_vivo => false, p_abre_en => now(), p_cierra_en => now() + interval '1 day',
    p_sectores => array[]::uuid[],
    p_preguntas => '[{"texto":"¿Asistirás?","opciones":["Sí","No"]}]'::jsonb) $$,
  'Sin sectores y sin tipo de selección también se puede crear');
select is((select para_todos from public.encuestas where titulo = 'Reunión anual'), true,
  'Sin sectores, para_todos es true');
select is((select count(*)::int from public.encuesta_sectores s
             join public.encuestas e on e.id = s.encuesta_id where e.titulo = 'Reunión anual'), 0,
  'Para todo el condominio no se guardan sectores');
select is((select q.seleccion::text from public.encuesta_preguntas q
             join public.encuestas e on e.id = q.encuesta_id where e.titulo = 'Reunión anual'), 'unica',
  'Si no se indica el tipo, la selección es única');

-- ───────────── Validaciones (RF8) ─────────────
select throws_ok($$ select public.crear_encuesta('Cierre inválido', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now() + interval '2 days', now() + interval '1 day',
    null, '[{"texto":"¿Sí?","opciones":["Sí","No"]}]'::jsonb) $$,
  '23514', null, 'Si cierra_en es anterior a abre_en se rechaza');
select throws_ok($$ select public.crear_encuesta('Cierre igual', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, '2030-01-01 10:00-05', '2030-01-01 10:00-05',
    null, '[{"texto":"¿Sí?","opciones":["Sí","No"]}]'::jsonb) $$,
  '23514', null, 'Si cierra_en es igual a abre_en también se rechaza');
select throws_ok($$ select public.crear_encuesta('   ', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":"¿Sí?","opciones":["Sí","No"]}]'::jsonb) $$,
  '22023', null, 'Un título vacío se rechaza');
select throws_ok($$ select public.crear_encuesta('Sin preguntas', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[]'::jsonb) $$,
  '22023', null, 'Sin preguntas se rechaza');
select throws_ok($$ select public.crear_encuesta('Una opción', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":"¿Sí?","opciones":["Solo una"]}]'::jsonb) $$,
  '22023', null, 'Una pregunta con una sola opción se rechaza');
select throws_ok($$ select public.crear_encuesta('Opción vacía', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":"¿Sí?","opciones":["Sí","Si","  "]}]'::jsonb) $$,
  '22023', null, 'Una opción vacía se rechaza');
select throws_ok($$ select public.crear_encuesta('Pregunta vacía', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":" ","opciones":["Sí","No"]}]'::jsonb) $$,
  '22023', null, 'Una pregunta sin texto se rechaza');
select throws_ok($$ select public.crear_encuesta('Selección rara', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":"¿Sí?","seleccion":"muchas","opciones":["Sí","No"]}]'::jsonb) $$,
  '22023', null, 'Un tipo de selección desconocido se rechaza');

-- ───────────── Atomicidad: si falla a la mitad no queda nada ─────────────
-- El sector no existe: la cabecera ya se insertó cuando falla la llave foránea del sector (23503).
select throws_ok($$ select public.crear_encuesta('Sector inexistente', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    array['10000000-0000-0000-0000-0000000000ff']::uuid[],
    '[{"texto":"¿Sí?","opciones":["Sí","No"]}]'::jsonb) $$,
  '23503', null, 'Un sector que no existe se rechaza');
select is((select count(*)::int from public.encuestas where titulo in
  ('Cierre inválido', 'Cierre igual', 'Sin preguntas', 'Una opción', 'Opción vacía', 'Pregunta vacía',
   'Selección rara', 'Sector inexistente')), 0, 'Las encuestas rechazadas no dejan ninguna fila');

-- ───────────── Quién puede crear ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ select public.crear_encuesta('De un residente', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":"¿Sí?","opciones":["Sí","No"]}]'::jsonb) $$,
  '42501', null, 'Un residente no puede crear encuestas');
select tests.como('90000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.crear_encuesta('De un guardia', null,
    '40000000-0000-0000-0000-000000000005', 'normal', false, now(), now() + interval '1 day',
    null, '[{"texto":"¿Sí?","opciones":["Sí","No"]}]'::jsonb) $$,
  '42501', null, 'Un guardia no puede crear encuestas');

select tests.como_postgres();
select is((select count(*)::int from public.encuestas where titulo in ('De un residente', 'De un guardia')), 0,
  'Las encuestas de quienes no son directiva no se guardan');

select * from finish();
rollback;

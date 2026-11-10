-- Pruebas de la función crear_aviso (RF7, RF13): guarda el aviso con sus sectores, solo la directiva
-- puede usarla, rechaza una vigencia invertida y, si algo falla, no queda ninguna fila. Usan los datos
-- de seed.sql. Usuarios del seed: directiva 90..01, guardia 90..02, residente 90..11 (Torre A).
--
-- Se relaciona con: la migración 8 (la función que se prueba), la 2 (CHECK de vigencia) y la 5 (RLS).
-- Los ayudantes tests.como* son los mismos de 03 a 06.
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
  'public.crear_aviso(text,text,uuid,timestamptz,timestamptz,uuid[],text)', 'execute'),
  'anon no puede ejecutar crear_aviso');

-- ───────────── La directiva publica un aviso para un sector (RF7, RF13) ─────────────
select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.crear_aviso(
    p_titulo => '  Corte de agua ', p_descripcion => 'Mañana de 9:00 a 13:00',
    p_categoria_id => '40000000-0000-0000-0000-000000000001',
    p_vigente_desde => now(), p_vigente_hasta => now() + interval '3 days',
    p_sectores => array['10000000-0000-0000-0000-000000000001']::uuid[],
    p_imagen_path => 'aviso-agua.jpg') $$,
  'La directiva publica un aviso para la Torre A');

select is((select count(*)::int from public.avisos where titulo = 'Corte de agua'), 1,
  'Se guarda el aviso (el título se guarda sin espacios sobrantes)');
select is((select autor_id from public.avisos where titulo = 'Corte de agua'),
  '90000000-0000-0000-0000-000000000001'::uuid, 'El autor es quien lo publica');
select is((select para_todos from public.avisos where titulo = 'Corte de agua'), false,
  'Con sectores, para_todos es false (RF13)');
select is((select imagen_path from public.avisos where titulo = 'Corte de agua'), 'aviso-agua.jpg',
  'Se guarda la ruta de la imagen (RF7)');
select is((select count(*)::int from public.aviso_sectores s
             join public.avisos a on a.id = s.aviso_id
            where a.titulo = 'Corte de agua'
              and s.sector_id = '10000000-0000-0000-0000-000000000001'), 1,
  'Se guarda el sector destino');

-- Un sector repetido se guarda una sola vez.
select lives_ok($$ select public.crear_aviso('Sectores repetidos', 'Texto',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day',
    array['10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'Un sector repetido no rompe la publicación');
select is((select count(*)::int from public.aviso_sectores s
             join public.avisos a on a.id = s.aviso_id where a.titulo = 'Sectores repetidos'), 1,
  'Un sector repetido se guarda una sola vez');

-- Sin sectores el aviso es para todo el condominio; la imagen vacía queda en NULL.
select lives_ok($$ select public.crear_aviso('Reunión general', 'Sábado a las 6 p. m.',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day',
    array[]::uuid[], '   ') $$,
  'Sin sectores y con imagen vacía también se puede publicar');
select is((select para_todos from public.avisos where titulo = 'Reunión general'), true,
  'Sin sectores, para_todos es true');
select is((select count(*)::int from public.aviso_sectores s
             join public.avisos a on a.id = s.aviso_id where a.titulo = 'Reunión general'), 0,
  'Para todo el condominio no se guardan sectores');
select is((select imagen_path from public.avisos where titulo = 'Reunión general'), null,
  'Una imagen vacía se guarda como NULL');

-- ───────────── Validaciones (RF7) ─────────────
select throws_ok($$ select public.crear_aviso('Vigencia inválida', 'Texto',
    '40000000-0000-0000-0000-000000000001', now() + interval '2 days', now() + interval '1 day', null) $$,
  '23514', null, 'Si vigente_hasta es anterior a vigente_desde se rechaza');
select throws_ok($$ select public.crear_aviso('Vigencia igual', 'Texto',
    '40000000-0000-0000-0000-000000000001', '2030-01-01 10:00-05', '2030-01-01 10:00-05', null) $$,
  '23514', null, 'Si vigente_hasta es igual a vigente_desde también se rechaza');
select throws_ok($$ select public.crear_aviso('   ', 'Texto',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', null) $$,
  '22023', null, 'Un título vacío se rechaza');
select throws_ok($$ select public.crear_aviso('Sin mensaje', '  ',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', null) $$,
  '22023', null, 'Un mensaje vacío se rechaza');
select throws_ok($$ select public.crear_aviso('Sin mensaje nulo', null,
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', null) $$,
  '22023', null, 'Un mensaje nulo se rechaza');
select throws_ok($$ select public.crear_aviso('Categoría inexistente', 'Texto',
    '40000000-0000-0000-0000-0000000000ff', now(), now() + interval '1 day', null) $$,
  '23503', null, 'Una categoría que no existe se rechaza');

-- ───────────── Atomicidad: si falla a la mitad no queda nada ─────────────
-- El sector no existe: la cabecera ya se insertó cuando falla la llave foránea del sector (23503).
select throws_ok($$ select public.crear_aviso('Sector inexistente', 'Texto',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day',
    array['10000000-0000-0000-0000-0000000000ff']::uuid[]) $$,
  '23503', null, 'Un sector que no existe se rechaza');
select is((select count(*)::int from public.avisos where titulo in
  ('Vigencia inválida', 'Vigencia igual', 'Sin mensaje', 'Sin mensaje nulo', 'Categoría inexistente',
   'Sector inexistente')), 0, 'Los avisos rechazados no dejan ninguna fila');

-- ───────────── Quién puede publicar ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ select public.crear_aviso('De un residente', 'Texto',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', null) $$,
  '42501', null, 'Un residente no puede publicar avisos');
select tests.como('90000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.crear_aviso('De un guardia', 'Texto',
    '40000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', null) $$,
  '42501', null, 'Un guardia no puede publicar avisos');

select tests.como_postgres();
select is((select count(*)::int from public.avisos where titulo in ('De un residente', 'De un guardia')), 0,
  'Los avisos de quienes no son directiva no se guardan');

select * from finish();
rollback;

-- Pruebas de la función registrar_dispositivo (push en Android, issue #7): guarda el token de Expo Push de
-- quien tiene sesión, es idempotente, mueve el token cuando el mismo teléfono cambia de cuenta, rechaza lo
-- inválido, no la usa `anon` ni un perfil inactivo, y RLS sigue protegiendo los tokens ajenos. Usan los datos
-- de seed.sql. Usuarios del seed: directiva 90..01, guardia 90..02, residente1 90..11 y residente2 90..12.
--
-- Se relaciona con: la migración 11 (la función que se prueba), la 1 (tabla dispositivos con el token único)
-- y la 5 (política "cada usuario gestiona los suyos"). Los ayudantes tests.como* son los mismos de 03 a 12.
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
select ok(not has_function_privilege('anon', 'public.registrar_dispositivo(text,public.plataforma_dispositivo)', 'execute'),
  'anon no puede ejecutar registrar_dispositivo');
select ok(has_function_privilege('authenticated', 'public.registrar_dispositivo(text,public.plataforma_dispositivo)', 'execute'),
  'authenticated sí puede ejecutar registrar_dispositivo');

-- ───────────── El guardia registra su teléfono Android ─────────────
select tests.como('90000000-0000-0000-0000-000000000002');
select lives_ok($$ select public.registrar_dispositivo('ExponentPushToken[tokenGuardiaAndroid0001]', 'android') $$,
  'El guardia registra el token de su teléfono');

select tests.como_postgres();
select is((select usuario_id from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  '90000000-0000-0000-0000-000000000002'::uuid, 'El token queda a nombre del guardia (auth.uid())');
select is((select plataforma::text from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  'android', 'Se guarda la plataforma');

-- ───────────── Idempotente: registrar dos veces no duplica y renueva la fecha ─────────────
update public.dispositivos set actualizado_en = now() - interval '1 day'
  where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]';
select tests.como('90000000-0000-0000-0000-000000000002');
select lives_ok($$ select public.registrar_dispositivo('ExponentPushToken[tokenGuardiaAndroid0001]', 'android') $$,
  'Registrar el mismo token otra vez no falla');
select tests.como_postgres();
select is((select count(*)::int from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  1, 'Sigue habiendo una sola fila para ese token');
select ok((select actualizado_en >= now() - interval '1 minute' from public.dispositivos
    where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  'Registrar de nuevo renueva actualizado_en');

-- ───────────── El mismo teléfono cambia de cuenta: el token pasa a la directiva ─────────────
select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.registrar_dispositivo('ExponentPushToken[tokenGuardiaAndroid0001]', 'android') $$,
  'La directiva registra el mismo teléfono (cambio de cuenta)');
select tests.como_postgres();
select is((select usuario_id from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  '90000000-0000-0000-0000-000000000001'::uuid, 'El token ahora es de la directiva');
select is((select count(*)::int from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  1, 'No se duplicó la fila al cambiar de cuenta');
select tests.como('90000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  0, 'El guardia ya no ve ese token');

-- ───────────── iOS y varios teléfonos por usuario ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ select public.registrar_dispositivo('ExpoPushToken[tokenResidenteIphone0001]', 'ios') $$,
  'Un residente registra un iPhone (formato ExpoPushToken)');
select lives_ok($$ select public.registrar_dispositivo('ExponentPushToken[tokenResidenteAndroid002]', 'android') $$,
  'Un mismo usuario puede tener varios teléfonos');
select is((select count(*)::int from public.dispositivos), 2, 'El residente ve exactamente sus dos teléfonos');

-- ───────────── Se rechaza lo inválido ─────────────
select tests.como('90000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.registrar_dispositivo('12345', 'android') $$, '22023', null,
  'Un token sin formato de Expo se rechaza');
select throws_ok($$ select public.registrar_dispositivo('ExponentPushToken[]', 'android') $$, '22023', null,
  'Un token vacío entre corchetes se rechaza');
select throws_ok($$ select public.registrar_dispositivo('ExponentPushToken[con espacio]', 'android') $$, '22023', null,
  'Un token con espacios se rechaza');
select throws_ok($$ select public.registrar_dispositivo(null, 'android') $$, '22023', null,
  'Un token nulo se rechaza');
select throws_ok($$ select public.registrar_dispositivo('ExponentPushToken[tokenGuardiaAndroid0003]', null) $$, '22023', null,
  'Sin plataforma se rechaza');

-- ───────────── Un perfil inactivo no puede registrar ─────────────
select tests.como_postgres();
update public.perfiles set activo = false where id = '90000000-0000-0000-0000-000000000012';
select tests.como('90000000-0000-0000-0000-000000000012');
select throws_ok($$ select public.registrar_dispositivo('ExponentPushToken[tokenInactivo0000000001]', 'android') $$, '42501', null,
  'Un perfil inactivo no puede registrar su teléfono');

-- ───────────── RLS sigue protegiendo los tokens ajenos ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ insert into public.dispositivos (usuario_id, expo_push_token, plataforma)
    values ('90000000-0000-0000-0000-000000000002', 'ExponentPushToken[tokenColadoPorOtro0001]', 'android') $$,
  '42501', null, 'Insertar directo un token a nombre de otro usuario sigue prohibido');

-- ───────────── Quitar el token al cerrar sesión: solo se borran los propios ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select results_eq($$ delete from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]' returning 1 $$,
  $$ select 1 where false $$, 'Un usuario no puede borrar el token de otra cuenta');
select results_eq($$ delete from public.dispositivos where expo_push_token = 'ExpoPushToken[tokenResidenteIphone0001]' returning 1 $$,
  $$ values (1) $$, 'El usuario sí borra su propio token (cerrar sesión)');

select tests.como_postgres();
select is((select count(*)::int from public.dispositivos where expo_push_token = 'ExponentPushToken[tokenGuardiaAndroid0001]'),
  1, 'El token de la directiva sigue ahí después del intento ajeno');
select is((select count(*)::int from public.dispositivos where expo_push_token = 'ExpoPushToken[tokenResidenteIphone0001]'),
  0, 'El token borrado por su dueño ya no existe');

select * from finish();
rollback;

-- Pruebas de triggers y de las reglas que viven en la base. Usan los datos de seed.sql.
-- Las funciones del esquema `tests` permiten actuar como un usuario de la API (rol authenticated)
-- y volver a postgres; desaparecen al terminar (rollback).
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
create function tests.como_postgres() returns void language plpgsql as $$ begin reset role; end $$;
grant execute on all functions in schema tests to public;

-- ───────────── Registro suave: el perfil solo se crea si el correo está habilitado y confirmado ─────────────
insert into public.residentes_habilitados (id, unidad_id, nombre, correo, creado_por) values
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Nora Campos Díaz', 'nora@neighborgood.test',  '90000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Tarde Confirma',   'tarde@neighborgood.test', '90000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Mayus Cula',       'mayus@neighborgood.test', '90000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'Unidad Cerrada',   'cerrada@neighborgood.test', '90000000-0000-0000-0000-000000000001');
update public.unidades set habilitada = false where id = '20000000-0000-0000-0000-000000000003';

insert into auth.users (id, email, email_confirmed_at) values
  ('90000000-0000-0000-0000-000000000021', 'nora@neighborgood.test', now());
select is((select rol::text || '/' || nombre || '/' || apellido from public.perfiles where id = '90000000-0000-0000-0000-000000000021'),
  'residente/Nora/Campos Díaz', 'Un correo habilitado y confirmado recibe su perfil de residente, con el nombre separado');
select is((select unidad_id from public.perfiles where id = '90000000-0000-0000-0000-000000000021'),
  '20000000-0000-0000-0000-000000000002'::uuid, 'El perfil queda en la unidad que la directiva asignó');
select ok((select registrado from public.residentes_habilitados where id = 'a0000000-0000-0000-0000-000000000001'),
  'El alta queda marcada como registrada');

insert into auth.users (id, email, email_confirmed_at) values
  ('90000000-0000-0000-0000-000000000022', 'nadie@neighborgood.test', now());
select is_empty($$ select 1 from public.perfiles where id = '90000000-0000-0000-0000-000000000022' $$,
  'Un correo no habilitado no recibe perfil (registro suave)');

insert into auth.users (id, email) values ('90000000-0000-0000-0000-000000000023', 'tarde@neighborgood.test');
select is_empty($$ select 1 from public.perfiles where id = '90000000-0000-0000-0000-000000000023' $$,
  'Un correo sin confirmar no recibe perfil todavía');
update auth.users set email_confirmed_at = now() where id = '90000000-0000-0000-0000-000000000023';
select isnt_empty($$ select 1 from public.perfiles where id = '90000000-0000-0000-0000-000000000023' $$,
  'Al confirmar el correo se crea el perfil');

insert into auth.users (id, email, email_confirmed_at) values
  ('90000000-0000-0000-0000-000000000024', 'MAYUS@Neighborgood.test', now());
select isnt_empty($$ select 1 from public.perfiles where id = '90000000-0000-0000-0000-000000000024' $$,
  'El correo se compara sin distinguir mayúsculas');

insert into auth.users (id, email, email_confirmed_at) values
  ('90000000-0000-0000-0000-000000000025', 'cerrada@neighborgood.test', now());
select is_empty($$ select 1 from public.perfiles where id = '90000000-0000-0000-0000-000000000025' $$,
  'Una unidad deshabilitada no recibe nuevos residentes');

-- ───────────── Alertas: nacen activas y copian el sector de la unidad ─────────────
insert into public.alertas (id, emisor_id, unidad_id, sector_id, tipo, estado, creada_en)
values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000011',
        '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'medica', 'atendida',
        now() - interval '5 days');
select is((select sector_id from public.alertas where id = 'b0000000-0000-0000-0000-000000000001'),
  '10000000-0000-0000-0000-000000000001'::uuid, 'El trigger copia el sector de la unidad e ignora el que se envió');
select is((select estado::text from public.alertas where id = 'b0000000-0000-0000-0000-000000000001'),
  'activa', 'Toda alerta nace activa');
select ok((select creada_en > now() - interval '1 minute' from public.alertas where id = 'b0000000-0000-0000-0000-000000000001'),
  'La hora de la alerta la fija la base, no la app');

-- ───────────── Bitácora de atenciones → estado de la alerta ─────────────
insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 'en_camino');
select is((select estado::text from public.alertas where id = 'b0000000-0000-0000-0000-000000000001'),
  'en_camino', 'La primera respuesta deja la alerta en camino');
select lives_ok($$
  insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
  values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'en_camino')
$$, 'Una segunda persona también puede ir en camino');
insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 'atendida');
select is((select estado::text from public.alertas where id = 'b0000000-0000-0000-0000-000000000001'),
  'atendida', 'La respuesta "atendida" cierra la alerta');
select throws_ok($$
  insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
  values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 'en_camino')
$$, '23514', null, 'Una alerta atendida no admite más respuestas');

-- ───────────── Votos: la selección debe ser válida ─────────────
insert into public.encuestas (id, autor_id, categoria_id, titulo, abre_en, cierra_en)
values ('60000000-0000-0000-0000-0000000000b1', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005',
        'Otra encuesta', now() - interval '1 day', now() + interval '1 day');
insert into public.encuesta_preguntas (id, encuesta_id, texto, seleccion, orden) values
  ('61000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-0000000000b1', 'Pregunta ajena', 'unica', 1),
  ('61000000-0000-0000-0000-0000000000b2', '60000000-0000-0000-0000-000000000001', 'Pregunta múltiple', 'multiple', 2);
insert into public.encuesta_opciones (id, pregunta_id, texto, orden) values
  ('62000000-0000-0000-0000-0000000000b1', '61000000-0000-0000-0000-0000000000b1', 'Opción ajena', 1),
  ('62000000-0000-0000-0000-0000000000b2', '61000000-0000-0000-0000-0000000000b2', 'M1', 1),
  ('62000000-0000-0000-0000-0000000000b3', '61000000-0000-0000-0000-0000000000b2', 'M2', 2);
insert into public.votos (id, encuesta_id, unidad_id, usuario_id)
values ('c0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000011');

select throws_ok($$
  insert into public.voto_opciones (voto_id, pregunta_id, opcion_id)
  values ('c0000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-0000000000b1', '62000000-0000-0000-0000-0000000000b1')
$$, '23514', null, 'La pregunta debe ser de la misma encuesta del voto');
select lives_ok($$
  insert into public.voto_opciones (voto_id, pregunta_id, opcion_id)
  values ('c0000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001')
$$, 'Una pregunta de selección única admite una opción');
select throws_ok($$
  insert into public.voto_opciones (voto_id, pregunta_id, opcion_id)
  values ('c0000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002')
$$, '23514', null, 'Una pregunta de selección única no admite una segunda opción');
select lives_ok($$
  insert into public.voto_opciones (voto_id, pregunta_id, opcion_id) values
    ('c0000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-0000000000b2', '62000000-0000-0000-0000-0000000000b2'),
    ('c0000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-0000000000b2', '62000000-0000-0000-0000-0000000000b3')
$$, 'Una pregunta de selección múltiple admite varias opciones');

-- ───────────── Perfiles: solo la directiva cambia rol, unidad o estado ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ update public.perfiles set telefono = '900000011' where id = '90000000-0000-0000-0000-000000000011' $$,
  'Un residente puede editar su teléfono');
select throws_ok($$ update public.perfiles set rol = 'directiva' where id = '90000000-0000-0000-0000-000000000011' $$,
  '42501', null, 'Un residente no puede ascenderse a directiva');
select throws_ok($$ update public.perfiles set unidad_id = '20000000-0000-0000-0000-000000000005' where id = '90000000-0000-0000-0000-000000000011' $$,
  '42501', null, 'Un residente no puede cambiarse de unidad');
select throws_ok($$ update public.perfiles set activo = false where id = '90000000-0000-0000-0000-000000000011' $$,
  '42501', null, 'Un residente no puede darse de baja ni reactivarse solo');
select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ update public.perfiles set activo = false where id = '90000000-0000-0000-0000-000000000013' $$,
  'La directiva puede dar de baja a un residente');
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.avisos), 0, 'Un perfil inactivo ya no ve avisos');
select is((select count(*)::int from public.sectores), 0, 'Un perfil inactivo ya no ve el catálogo');
select tests.como_postgres();

-- ───────────── Incidencias: responsable y fechas al cambiar el estado ─────────────
select tests.como('90000000-0000-0000-0000-000000000001');
update public.incidencias set estado = 'en_atencion' where id = '80000000-0000-0000-0000-000000000001';
select tests.como_postgres();
select is((select atendido_por from public.incidencias where id = '80000000-0000-0000-0000-000000000001'),
  '90000000-0000-0000-0000-000000000001'::uuid, 'El trigger anota quién atiende la incidencia');
select ok((select resuelta_en is null from public.incidencias where id = '80000000-0000-0000-0000-000000000001'),
  'Una incidencia en atención aún no tiene fecha de resolución');
select tests.como('90000000-0000-0000-0000-000000000001');
update public.incidencias set estado = 'resuelto' where id = '80000000-0000-0000-0000-000000000001';
select tests.como_postgres();
select ok((select resuelta_en is not null from public.incidencias where id = '80000000-0000-0000-0000-000000000001'),
  'Al resolverla se guarda la fecha de resolución');

-- ───────────── Pases: anular y estados finales ─────────────
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ update public.pases_visita set estado = 'anulado' where id = '70000000-0000-0000-0000-000000000001' $$,
  'El residente anula su pase vigente');
select tests.como_postgres();
select ok((select anulado_en is not null from public.pases_visita where id = '70000000-0000-0000-0000-000000000001'),
  'El trigger fija la hora de anulación');
select throws_ok($$ update public.pases_visita set estado = 'vigente', anulado_en = null where id = '70000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'Un pase anulado no vuelve a estar vigente');

select * from finish();
rollback;

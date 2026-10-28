-- Matriz de políticas RLS: qué ve y qué escribe cada rol. Usa los datos de seed.sql.
-- Usuarios del seed: directiva 90..01, guardia 90..02, residentes 90..11 y 90..12 (unidad A-101, Torre A),
-- residente 90..13 (unidad B-101, Torre B) e intruso 90..99 (cuenta confirmada sin perfil).
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

-- ═════════════ Sin sesión y sin perfil ═════════════
select tests.como_anon();
select throws_ok($$ select * from public.avisos $$, '42501', null, 'Sin sesión (anon) no se puede leer ninguna tabla');
select throws_ok($$ select * from public.sectores $$, '42501', null, 'Sin sesión tampoco el catálogo');
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001', '[]'::jsonb) $$,
  '42501', null, 'Sin sesión no se ejecuta emitir_voto');

select tests.como('90000000-0000-0000-0000-000000000099');  -- intruso: confirmado, sin perfil
select is((select count(*)::int from public.sectores), 0, 'Sin perfil no se ve el catálogo');
select is((select count(*)::int from public.avisos),    0, 'Sin perfil no se ven avisos');
select is((select count(*)::int from public.perfiles),  0, 'Sin perfil no se ve ni el propio (no existe)');
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001', '[]'::jsonb) $$,
  '42501', null, 'Sin perfil no se puede votar');

-- ═════════════ Lecturas de cada rol (antes de crear datos nuevos) ═════════════
select tests.como('90000000-0000-0000-0000-000000000011');  -- residente 1, Torre A
select is((select count(*)::int from public.sectores),             3, 'Residente: ve los 3 sectores');
select is((select count(*)::int from public.unidades),            12, 'Residente: ve las 12 unidades');
select is((select count(*)::int from public.categorias_aviso),     5, 'Residente: ve las categorías');
select is((select count(*)::int from public.residentes_habilitados), 0, 'Residente: no ve la lista de correos habilitados');
select is((select count(*)::int from public.perfiles),             1, 'Residente: solo ve su propio perfil');
select is((select count(*)::int from public.avisos),               3, 'Residente de la Torre A: ve los avisos para todos, el de su torre y el historial');
select is((select count(*)::int from public.aviso_sectores),       1, 'Residente: ve a qué sector va el aviso que le llega');
select is((select count(*)::int from public.encuestas),            1, 'Residente: ve la encuesta abierta');
select is((select count(*)::int from public.encuesta_preguntas),   1, 'Residente: ve las preguntas de sus encuestas');
select is((select count(*)::int from public.encuesta_opciones),    2, 'Residente: ve las opciones de sus encuestas');
select is((select count(*)::int from public.contactos_emergencia), 2, 'Residente: ve sus 2 contactos de emergencia');
select is((select count(*)::int from public.pases_visita),         1, 'Residente: ve sus pases');
select is((select count(*)::int from public.incidencias),          1, 'Residente: ve sus incidencias');
select is((select count(*)::int from public.votos),                0, 'Residente: aún no hay votos de su unidad');

select tests.como('90000000-0000-0000-0000-000000000013');  -- residente 3, Torre B
select is((select count(*)::int from public.avisos),               2, 'Residente de la Torre B: no ve el aviso de la Torre A');
select is((select count(*)::int from public.contactos_emergencia), 0, 'Residente: no ve los contactos de otro residente');
select is((select count(*)::int from public.pases_visita),         0, 'Residente: no ve los pases de otra unidad');
select is((select count(*)::int from public.incidencias),          0, 'Residente: no ve las incidencias de otro');
select is((select count(*)::int from public.perfiles),             1, 'Residente: no ve los perfiles de sus vecinos');

select tests.como('90000000-0000-0000-0000-000000000002');  -- guardia
select is((select count(*)::int from public.perfiles),             4, 'Guardia: ve su perfil y el de los 3 residentes');
select is((select count(*)::int from public.avisos),               0, 'Guardia: no ve avisos');
select is((select count(*)::int from public.encuestas),            0, 'Guardia: no ve encuestas');
select is((select count(*)::int from public.residentes_habilitados), 0, 'Guardia: no ve la lista de correos habilitados');
select is((select count(*)::int from public.pases_visita),         1, 'Guardia: ve los pases de hoy');
select is((select count(*)::int from public.incidencias),          0, 'Guardia: no ve incidencias');
select is((select count(*)::int from public.contactos_emergencia), 0, 'Guardia: sin alerta en curso no ve contactos');

select tests.como('90000000-0000-0000-0000-000000000001');  -- directiva
select is((select count(*)::int from public.perfiles),             5, 'Directiva: ve todos los perfiles');
select is((select count(*)::int from public.residentes_habilitados), 3, 'Directiva: ve los correos habilitados');
select is((select count(*)::int from public.avisos),               3, 'Directiva: ve todos los avisos');
select is((select count(*)::int from public.incidencias),          1, 'Directiva: ve todas las incidencias');
select is((select count(*)::int from public.pases_visita),         1, 'Directiva: ve todos los pases');
select is((select count(*)::int from public.contactos_emergencia), 0, 'Directiva: sin alerta en curso no ve contactos');
select tests.como_postgres();

-- ═════════════ Votación: emitir_voto, un voto por unidad y resultados ═════════════
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000001","opcion_id":"62000000-0000-0000-0000-000000000001"}]'::jsonb) $$,
  'Un residente vota por su unidad');
select is((select count(*)::int from public.votos), 1, 'La unidad ve su voto ("Tu unidad ya votó")');
select is((select count(*)::int from public.voto_opciones), 1, 'La unidad ve las opciones que eligió');

select tests.como('90000000-0000-0000-0000-000000000012');  -- misma unidad A-101
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000001","opcion_id":"62000000-0000-0000-0000-000000000002"}]'::jsonb) $$,
  '23505', null, 'Otra persona de la misma unidad no puede votar de nuevo');
select is((select count(*)::int from public.votos), 1, 'Pero sí ve el voto de su unidad');

select tests.como('90000000-0000-0000-0000-000000000013');  -- otra unidad
select is((select count(*)::int from public.votos), 0, 'Otra unidad no ve los votos ajenos');
select lives_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000001","opcion_id":"62000000-0000-0000-0000-000000000002"}]'::jsonb) $$,
  'Otra unidad sí puede votar');
select throws_ok($$ insert into public.votos (encuesta_id, unidad_id, usuario_id)
    values ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000013') $$,
  '42501', null, 'No se puede insertar un voto directamente: se usa emitir_voto');
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001', '[]'::jsonb) $$,
  '22023', null, 'Un voto sin opciones se rechaza');

select tests.como('90000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000001',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000001","opcion_id":"62000000-0000-0000-0000-000000000001"}]'::jsonb) $$,
  '42501', null, 'Un guardia no vota');

select tests.como('90000000-0000-0000-0000-000000000011');
select is((select total from public.resultados_encuesta('60000000-0000-0000-0000-000000000001')
            where opcion_id = '62000000-0000-0000-0000-000000000001'), 1::bigint,
  'Resultados en vivo: una unidad votó la opción 1');
select is((select total from public.resultados_encuesta('60000000-0000-0000-0000-000000000001')
            where opcion_id = '62000000-0000-0000-0000-000000000002'), 1::bigint,
  'Resultados en vivo: otra unidad votó la opción 2');
select tests.como_postgres();

-- Encuestas adicionales: una abierta sin resultados en vivo, una solo para la Torre B, una cerrada y una futura.
insert into public.encuestas (id, autor_id, categoria_id, para_todos, titulo, resultados_en_vivo, abre_en, cierra_en) values
  ('60000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', true,  'Sin resultados en vivo', false, now() - interval '1 day',  now() + interval '5 days'),
  ('60000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', false, 'Solo Torre B',           true,  now() - interval '1 day',  now() + interval '5 days'),
  ('60000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', true,  'Ya cerrada',             false, now() - interval '10 days', now() - interval '1 day'),
  ('60000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', true,  'Todavía no abre',       true,  now() + interval '2 days', now() + interval '9 days');
insert into public.encuesta_sectores (encuesta_id, sector_id) values
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002');
insert into public.encuesta_preguntas (id, encuesta_id, texto, orden) values
  ('61000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000002', 'P2', 1),
  ('61000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000003', 'P3', 1),
  ('61000000-0000-0000-0000-000000000014', '60000000-0000-0000-0000-000000000004', 'P4', 1);
insert into public.encuesta_opciones (id, pregunta_id, texto, orden) values
  ('62000000-0000-0000-0000-000000000012', '61000000-0000-0000-0000-000000000012', 'O2', 1),
  ('62000000-0000-0000-0000-000000000013', '61000000-0000-0000-0000-000000000013', 'O3', 1),
  ('62000000-0000-0000-0000-000000000014', '61000000-0000-0000-0000-000000000014', 'O4', 1);

select tests.como('90000000-0000-0000-0000-000000000011');  -- Torre A
select is((select count(*)::int from public.encuestas), 3,
  'Residente de la Torre A: ve la abierta, la sin resultados en vivo y la cerrada; no la de la Torre B ni la futura');
select throws_ok($$ select * from public.resultados_encuesta('60000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'Una encuesta abierta sin resultados en vivo no muestra conteos a los residentes');
select lives_ok($$ select * from public.resultados_encuesta('60000000-0000-0000-0000-000000000004') $$,
  'Al cerrar la encuesta, los residentes ven los resultados');
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000003',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000013","opcion_id":"62000000-0000-0000-0000-000000000013"}]'::jsonb) $$,
  '42501', null, 'No se puede votar una encuesta dirigida a otro sector');
select throws_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000004',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000014","opcion_id":"62000000-0000-0000-0000-000000000014"}]'::jsonb) $$,
  '22023', null, 'No se puede votar una encuesta cerrada');
select throws_ok($$ select * from public.resultados_encuesta('60000000-0000-0000-0000-000000000005') $$,
  '42501', null, 'Una encuesta que aún no abre no se ve ni sus resultados');

select tests.como('90000000-0000-0000-0000-000000000013');  -- Torre B
select lives_ok($$ select public.emitir_voto('60000000-0000-0000-0000-000000000003',
    '[{"pregunta_id":"61000000-0000-0000-0000-000000000013","opcion_id":"62000000-0000-0000-0000-000000000013"}]'::jsonb) $$,
  'Un residente de la Torre B sí vota la encuesta de su torre');

select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ select * from public.resultados_encuesta('60000000-0000-0000-0000-000000000002') $$,
  'La directiva ve los resultados en cualquier momento');
select tests.como_postgres();

-- ═════════════ Alertas: emisión, vecinos, personal y bitácora ═════════════
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ insert into public.alertas (emisor_id, unidad_id, tipo)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'medica') $$,
  'Un residente emite una alerta desde su unidad');
select throws_ok($$ insert into public.alertas (emisor_id, unidad_id, tipo)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000005', 'medica') $$,
  '42501', null, 'No se puede emitir una alerta desde la unidad de otro');
select throws_ok($$ insert into public.alertas (emisor_id, unidad_id, tipo)
    values ('90000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 'medica') $$,
  '42501', null, 'No se puede emitir una alerta en nombre de otro');
select throws_ok($$ insert into public.alertas (emisor_id, unidad_id, tipo, estado)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'medica', 'atendida') $$,
  '42501', null, 'La app no puede fijar el estado de una alerta');
select throws_ok($$ update public.alertas set estado = 'atendida' $$,
  '42501', null, 'La app no actualiza alertas directamente');

select tests.como('90000000-0000-0000-0000-000000000012');  -- vecino de la misma unidad y sector
select is((select count(*)::int from public.alertas), 1, 'Los vecinos del mismo sector ven la alerta (RF25)');
select tests.como('90000000-0000-0000-0000-000000000013');  -- otro sector
select is((select count(*)::int from public.alertas), 0, 'Los residentes de otro sector no la ven');
select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.alertas), 1, 'La directiva ve la alerta');

select tests.como('90000000-0000-0000-0000-000000000002');  -- guardia
select is((select count(*)::int from public.alertas), 1, 'El guardia ve la alerta');
select is((select count(*)::int from public.contactos_emergencia), 2, 'Con la alerta activa, el guardia ve los contactos de quien la emitió');
select lives_ok($$ insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
    select a.id, '90000000-0000-0000-0000-000000000002', 'en_camino' from public.alertas a $$,
  'El guardia marca "estoy en camino"');
select throws_ok($$ insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
    select a.id, '90000000-0000-0000-0000-000000000001', 'atendida' from public.alertas a $$,
  '42501', null, 'El guardia no responde en nombre de otra persona');

select tests.como('90000000-0000-0000-0000-000000000011');
select is((select estado::text from public.alertas), 'en_camino', 'El emisor ve que su alerta va en camino');
select is((select count(*)::int from public.alerta_atenciones), 1, 'El emisor ve las respuestas a su alerta');
select throws_ok($$ insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
    select a.id, '90000000-0000-0000-0000-000000000011', 'atendida' from public.alertas a $$,
  '42501', null, 'Un residente no atiende alertas');

select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
    select a.id, '90000000-0000-0000-0000-000000000001', 'atendida' from public.alertas a $$,
  'La directiva marca la alerta como atendida');
select tests.como('90000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.contactos_emergencia), 0,
  'Con la alerta atendida, el personal deja de ver los contactos');
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.contactos_emergencia), 0, 'Un residente nunca ve los contactos ajenos');
select tests.como_postgres();

-- ═════════════ Pases de visita ═════════════
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Directo', current_date) $$,
  '42501', null, 'La app no crea pases: los crea la Edge Function');
select throws_ok($$ update public.pases_visita set estado = 'usado' where id = '70000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'Un residente no marca su pase como usado');
select tests.como_postgres();
update public.pases_visita set fecha_visita = fecha_visita + 1 where id = '70000000-0000-0000-0000-000000000001';
select tests.como('90000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.pases_visita), 0, 'El guardia solo ve los pases de hoy (hora de Lima)');
select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.pases_visita), 1, 'La directiva ve todos los pases');
select tests.como_postgres();

-- ═════════════ Incidencias y fotos ═════════════
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ insert into public.incidencias (reportado_por, unidad_id, ubicacion, descripcion)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Dpto A-101', 'Filtración en el baño') $$,
  'Un residente reporta una incidencia de su unidad');
select throws_ok($$ insert into public.incidencias (reportado_por, unidad_id, ubicacion, descripcion)
    values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000005', 'Dpto B-101', 'Ajena') $$,
  '42501', null, 'No se reporta una incidencia a nombre de otra unidad');
select lives_ok($$ insert into public.incidencia_fotos (incidencia_id, foto_path, orden)
    select i.id, 'a/1.jpg', 1 from public.incidencias i where i.descripcion = 'Filtración en el baño' $$,
  'El dueño agrega la foto de su incidencia');
update public.incidencias set estado = 'resuelto' where id = '80000000-0000-0000-0000-000000000001';  -- no debe afectar nada
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.incidencias), 0, 'Otro residente no ve incidencias ajenas');
select is((select count(*)::int from public.incidencia_fotos), 0, 'Otro residente no ve las fotos ajenas');
select throws_ok($$ insert into public.incidencia_fotos (incidencia_id, foto_path, orden)
    values ('80000000-0000-0000-0000-000000000001', 'b/1.jpg', 1) $$,
  '42501', null, 'No se agregan fotos a la incidencia de otro');
select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.incidencias), 2, 'La directiva ve todas las incidencias');
select is((select count(*)::int from public.incidencia_fotos), 1, 'La directiva ve las fotos');
select tests.como_postgres();
select is((select estado::text from public.incidencias where id = '80000000-0000-0000-0000-000000000001'), 'pendiente',
  'Un residente no puede cambiar el estado de una incidencia');

-- ═════════════ Escritura de catálogos, avisos y datos propios ═════════════
select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$ insert into public.avisos (autor_id, categoria_id, titulo, descripcion, vigente_desde, vigente_hasta)
    values ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Nuevo', 'Aviso nuevo',
            now(), now() + interval '2 days') $$,
  'La directiva publica un aviso');
select throws_ok($$ insert into public.avisos (autor_id, categoria_id, titulo, descripcion, vigente_desde, vigente_hasta)
    values ('90000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'A nombre de otro', 'x',
            now(), now() + interval '2 days') $$,
  '42501', null, 'La directiva no publica a nombre de otra persona');
select lives_ok($$ insert into public.sectores (nombre, tipo) values ('Manzana D', 'manzana') $$, 'La directiva crea sectores');
select lives_ok($$ insert into public.residentes_habilitados (unidad_id, nombre, correo, creado_por)
    values ('20000000-0000-0000-0000-000000000002', 'Nuevo Vecino', 'nuevo@neighborgood.test', '90000000-0000-0000-0000-000000000001') $$,
  'La directiva habilita a un nuevo residente');

select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$ insert into public.avisos (autor_id, categoria_id, titulo, descripcion, vigente_desde, vigente_hasta)
    values ('90000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000002', 'Intento', 'x',
            now(), now() + interval '2 days') $$,
  '42501', null, 'Un residente no publica avisos');
select throws_ok($$ insert into public.residentes_habilitados (unidad_id, nombre, correo, creado_por)
    values ('20000000-0000-0000-0000-000000000002', 'Colado', 'colado@neighborgood.test', '90000000-0000-0000-0000-000000000011') $$,
  '42501', null, 'Un residente no habilita a otros residentes');
select lives_ok($$ insert into public.registros_sesion (usuario_id) values ('90000000-0000-0000-0000-000000000011') $$,
  'Cada usuario registra su propio inicio de sesión');
select throws_ok($$ insert into public.registros_sesion (usuario_id) values ('90000000-0000-0000-0000-000000000012') $$,
  '42501', null, 'No se registra la sesión de otro usuario');
select lives_ok($$ insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
    values ('90000000-0000-0000-0000-000000000011', 'Tercer contacto', '977000003', 3) $$,
  'Un residente agrega su tercer contacto');
select throws_ok($$ insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
    values ('90000000-0000-0000-0000-000000000011', 'Cuarto contacto', '977000004', 4) $$,
  '23514', null, 'El cuarto contacto se rechaza');
select throws_ok($$ insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
    values ('90000000-0000-0000-0000-000000000013', 'En nombre de otro', '977000005', 1) $$,
  '42501', null, 'No se agregan contactos a nombre de otro');
select lives_ok($$ insert into public.dispositivos (usuario_id, expo_push_token, plataforma)
    values ('90000000-0000-0000-0000-000000000011', 'ExponentPushToken[abc]', 'android') $$,
  'Un usuario registra el token de su dispositivo');
select tests.como('90000000-0000-0000-0000-000000000012');
select is((select count(*)::int from public.dispositivos), 0, 'Los tokens de otros usuarios no se ven');
select tests.como('90000000-0000-0000-0000-000000000011');
update public.perfiles set nombre = 'Hackeado' where id = '90000000-0000-0000-0000-000000000012';
select tests.como_postgres();
select isnt((select nombre from public.perfiles where id = '90000000-0000-0000-0000-000000000012'), 'Hackeado',
  'Un residente no edita el perfil de otro');

-- ═════════════ Storage ═════════════
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$ insert into storage.objects (bucket_id, name)
    values ('incidencias', '90000000-0000-0000-0000-000000000011/80000000-0000-0000-0000-000000000001/1.jpg') $$,
  'Storage: el residente sube una foto en su carpeta');
select throws_ok($$ insert into storage.objects (bucket_id, name)
    values ('incidencias', '90000000-0000-0000-0000-000000000013/x/1.jpg') $$,
  '42501', null, 'Storage: no se sube a la carpeta de otro');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('avisos', 'intento.jpg') $$,
  '42501', null, 'Storage: un residente no sube imágenes de avisos');
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from storage.objects where bucket_id = 'incidencias'), 0, 'Storage: no se ven las fotos de otro residente');
select tests.como('90000000-0000-0000-0000-000000000001');
select is((select count(*)::int from storage.objects where bucket_id = 'incidencias'), 1, 'Storage: la directiva ve las fotos de incidencias');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('avisos', 'aviso.jpg') $$, 'Storage: la directiva sube imágenes de avisos');
select tests.como('90000000-0000-0000-0000-000000000012');
select is((select count(*)::int from storage.objects where bucket_id = 'avisos'), 1, 'Storage: los residentes ven las imágenes de avisos');
select tests.como_postgres();

select * from finish();
rollback;

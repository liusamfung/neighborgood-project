-- Pruebas de restricciones (CHECK, únicas y llaves foráneas). Se ejecutan como postgres,
-- sin pasar por RLS, para probar solo las reglas de la estructura. Usan los datos de seed.sql.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ───────────── Contactos de emergencia: máximo 3 ─────────────
select lives_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
  values ('90000000-0000-0000-0000-000000000011', 'Tercer contacto', '977000003', 3)
$$, 'Se puede agregar el tercer contacto');
select throws_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
  values ('90000000-0000-0000-0000-000000000011', 'Cuarto contacto', '977000004', 4)
$$, '23514', null, 'El cuarto contacto se rechaza (el orden va de 1 a 3)');
select throws_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
  values ('90000000-0000-0000-0000-000000000011', 'Repetido', '977000005', 3)
$$, '23505', null, 'No se repite el orden de un contacto');

-- ───────────── Fotos de una incidencia: de 1 a 3 ─────────────
select lives_ok($$
  insert into public.incidencia_fotos (incidencia_id, foto_path, orden) values
    ('80000000-0000-0000-0000-000000000001', 'a/1.jpg', 1),
    ('80000000-0000-0000-0000-000000000001', 'a/2.jpg', 2),
    ('80000000-0000-0000-0000-000000000001', 'a/3.jpg', 3)
$$, 'Una incidencia admite 3 fotos');
select throws_ok($$
  insert into public.incidencia_fotos (incidencia_id, foto_path, orden)
  values ('80000000-0000-0000-0000-000000000001', 'a/4.jpg', 4)
$$, '23514', null, 'Una cuarta foto se rechaza');
select throws_ok($$
  insert into public.incidencia_fotos (incidencia_id, foto_path, orden)
  values ('80000000-0000-0000-0000-000000000001', 'a/otra.jpg', 2)
$$, '23505', null, 'No se repite la posición de una foto');

-- ───────────── Fechas ─────────────
select throws_ok($$
  insert into public.avisos (autor_id, categoria_id, titulo, descripcion, vigente_desde, vigente_hasta)
  values ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 't', 'd',
          now(), now() - interval '1 hour')
$$, '23514', null, 'Un aviso no puede vencer antes de empezar');
select throws_ok($$
  insert into public.encuestas (autor_id, categoria_id, titulo, abre_en, cierra_en)
  values ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 't',
          now(), now() - interval '1 hour')
$$, '23514', null, 'Una encuesta no puede cerrar antes de abrir');

-- ───────────── Un voto por unidad ─────────────
select lives_ok($$
  insert into public.votos (encuesta_id, unidad_id, usuario_id)
  values ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000011')
$$, 'La primera persona de una unidad registra el voto');
select throws_ok($$
  insert into public.votos (encuesta_id, unidad_id, usuario_id)
  values ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000012')
$$, '23505', null, 'La segunda persona de la misma unidad no puede votar (llave única)');

-- ───────────── Registro: correo, residentes y sectores ─────────────
select throws_ok($$
  insert into public.residentes_habilitados (unidad_id, nombre, correo, creado_por)
  values ('20000000-0000-0000-0000-000000000002', 'Ana', 'Ana@Ejemplo.TEST', '90000000-0000-0000-0000-000000000001')
$$, '23514', null, 'El correo habilitado se guarda en minúsculas y sin espacios');
select throws_ok($$
  insert into public.sectores (nombre, tipo) values ('Torre A', 'torre')
$$, '23505', null, 'No se repite el nombre de un sector del mismo tipo');

insert into auth.users (id, email) values ('90000000-0000-0000-0000-0000000000a1', 'sinunidad@neighborgood.test');
select throws_ok($$
  insert into public.perfiles (id, nombre, apellido, rol)
  values ('90000000-0000-0000-0000-0000000000a1', 'Sin', 'Unidad', 'residente')
$$, '23514', null, 'Un residente siempre tiene unidad');
select lives_ok($$
  insert into public.perfiles (id, nombre, apellido, rol)
  values ('90000000-0000-0000-0000-0000000000a1', 'Otro', 'Guardia', 'guardia')
$$, 'La directiva y los guardias no necesitan unidad');

-- ───────────── Pases: estado y fechas coherentes ─────────────
select throws_ok($$
  insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, estado, ingreso_en)
  values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'X', current_date, 'usado', now())
$$, '23514', null, 'Un pase usado necesita el guardia que validó el ingreso');
select throws_ok($$
  insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, estado, ingreso_en)
  values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'X', current_date, 'vigente', now())
$$, '23514', null, 'Un pase vigente no tiene hora de ingreso');
select throws_ok($$
  insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, estado)
  values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'X', current_date, 'anulado')
$$, '23514', null, 'Un pase anulado necesita la hora de anulación');
select throws_ok($$
  insert into public.pases_visita (residente_id, unidad_id, nombre_visitante, fecha_visita, estado, guardia_id, ingreso_en, salida_en)
  values ('90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'X', current_date, 'usado',
          '90000000-0000-0000-0000-000000000002', now(), now() - interval '1 hour')
$$, '23514', null, 'La salida no puede ser anterior al ingreso');

-- ───────────── Bitácora de alertas: solo en_camino o atendida ─────────────
insert into public.alertas (id, emisor_id, unidad_id, sector_id, tipo)
values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000011',
        '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'seguridad');
select throws_ok($$
  insert into public.alerta_atenciones (alerta_id, usuario_id, estado)
  values ('b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 'activa')
$$, '23514', null, 'La bitácora no admite el estado activa');

-- ───────────── Llave compuesta: la opción pertenece a la pregunta ─────────────
-- La pregunta 2 es de la misma encuesta, pero la opción 1 pertenece a la pregunta 1.
insert into public.encuesta_preguntas (id, encuesta_id, texto, seleccion, orden)
values ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Segunda pregunta', 'unica', 2);
select throws_ok($$
  insert into public.voto_opciones (voto_id, pregunta_id, opcion_id)
  select v.id, '61000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000001'
    from public.votos v limit 1
$$, '23503', null, 'No se puede registrar una opción con una pregunta que no es la suya');

select * from finish();
rollback;

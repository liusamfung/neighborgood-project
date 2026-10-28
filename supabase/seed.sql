-- =====================================================================
-- NeighborGood · datos de prueba para DESARROLLO LOCAL
--
-- Se ejecuta solo con `supabase db reset` (Supabase local en Docker).
-- NUNCA se ejecuta en el proyecto real: el proyecto gratuito es un solo
-- ambiente (DEV, QA y PRD) y estos usuarios tienen una contraseña conocida.
--
-- Condominio ficticio "Los Álamos". Contraseña de todos los usuarios: Prueba123!
--   directiva@neighborgood.test   directiva
--   guardia@neighborgood.test     guardia
--   residente1@neighborgood.test  residente, unidad A-101 (Torre A)
--   residente2@neighborgood.test  residente, unidad A-101 (misma unidad que residente1)
--   residente3@neighborgood.test  residente, unidad B-101 (Torre B)
--   intruso@neighborgood.test     cuenta confirmada pero NO habilitada: no recibe perfil
-- Los ids son fijos para que las pruebas de supabase/tests puedan referirse a ellos.
-- =====================================================================

-- ───────────── Estructura del condominio ─────────────
insert into public.sectores (id, nombre, tipo) values
  ('10000000-0000-0000-0000-000000000001', 'Torre A',     'torre'),
  ('10000000-0000-0000-0000-000000000002', 'Torre B',     'torre'),
  ('10000000-0000-0000-0000-000000000003', 'Pabellón C',  'pabellon');

insert into public.unidades (id, sector_id, codigo) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A-101'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'A-102'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'A-201'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'A-202'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'B-101'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'B-102'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'B-201'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'B-202'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'C-1'),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', 'C-2'),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', 'C-3'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', 'C-4');

insert into public.categorias_aviso (id, nombre) values
  ('40000000-0000-0000-0000-000000000001', 'Mantenimiento'),
  ('40000000-0000-0000-0000-000000000002', 'Seguridad'),
  ('40000000-0000-0000-0000-000000000003', 'Eventos'),
  ('40000000-0000-0000-0000-000000000004', 'Pagos'),
  ('40000000-0000-0000-0000-000000000005', 'Otros');

-- ───────────── Personal: directiva y guardia ─────────────
-- Sus perfiles se insertan a mano (el trigger de registro solo crea los de los residentes).
create or replace function pg_temp.crear_usuario(p_id uuid, p_correo text)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_correo,
    extensions.crypt('Prueba123!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id::text, p_id,
          jsonb_build_object('sub', p_id::text, 'email', p_correo, 'email_verified', true),
          'email', now(), now(), now());
end $$;

select pg_temp.crear_usuario('90000000-0000-0000-0000-000000000001', 'directiva@neighborgood.test');
select pg_temp.crear_usuario('90000000-0000-0000-0000-000000000002', 'guardia@neighborgood.test');

insert into public.perfiles (id, unidad_id, nombre, apellido, telefono, rol) values
  ('90000000-0000-0000-0000-000000000001', null, 'Marta',  'Quispe Huamán', '999000001', 'directiva'),
  ('90000000-0000-0000-0000-000000000002', null, 'Jorge',  'Salazar Vega',  '999000002', 'guardia');

-- ───────────── Residentes: primero se habilitan, luego se registran ─────────────
-- Al insertar el usuario confirmado, el trigger crea su perfil porque el correo está habilitado.
insert into public.residentes_habilitados (unidad_id, nombre, correo, creado_por) values
  ('20000000-0000-0000-0000-000000000001', 'Rosa Mendoza Paredes', 'residente1@neighborgood.test', '90000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', 'Luis Mendoza Paredes', 'residente2@neighborgood.test', '90000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', 'Carla Ríos Soto',      'residente3@neighborgood.test', '90000000-0000-0000-0000-000000000001');

select pg_temp.crear_usuario('90000000-0000-0000-0000-000000000011', 'residente1@neighborgood.test');
select pg_temp.crear_usuario('90000000-0000-0000-0000-000000000012', 'residente2@neighborgood.test');
select pg_temp.crear_usuario('90000000-0000-0000-0000-000000000013', 'residente3@neighborgood.test');
select pg_temp.crear_usuario('90000000-0000-0000-0000-000000000099', 'intruso@neighborgood.test');  -- sin perfil

-- ───────────── Contenido de ejemplo ─────────────
insert into public.contactos_emergencia (usuario_id, nombre, telefono, parentesco, orden) values
  ('90000000-0000-0000-0000-000000000011', 'Pedro Mendoza', '988111111', 'Esposo', 1),
  ('90000000-0000-0000-0000-000000000011', 'Ana Paredes',   '988222222', 'Madre',  2);

insert into public.avisos (id, autor_id, categoria_id, para_todos, titulo, descripcion, vigente_desde, vigente_hasta) values
  ('50000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', true,
   'Corte de agua programado', 'El sábado se cortará el agua de 8 a. m. a 12 m. por mantenimiento de la cisterna.',
   now() - interval '1 day', now() + interval '7 days'),
  ('50000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', false,
   'Fumigación en la Torre A', 'Se fumigarán los pasillos de la Torre A. Evita dejar mascotas en los pasillos.',
   now() - interval '1 day', now() + interval '3 days'),
  ('50000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', true,
   'Reunión de vecinos (ya realizada)', 'Se aprobó el cronograma de mantenimiento del año.',
   now() - interval '30 days', now() - interval '20 days');
insert into public.aviso_sectores (aviso_id, sector_id) values
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001');

insert into public.encuestas (id, autor_id, categoria_id, para_todos, titulo, descripcion, prioridad, resultados_en_vivo, abre_en, cierra_en) values
  ('60000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', true,
   'Horario de la piscina', 'Elige el horario de atención para el próximo año.', 'alta', true,
   now() - interval '1 day', now() + interval '7 days');
insert into public.encuesta_preguntas (id, encuesta_id, texto, seleccion, orden) values
  ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '¿Qué horario prefieres?', 'unica', 1);
insert into public.encuesta_opciones (id, pregunta_id, texto, orden) values
  ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '6 a. m. a 10 p. m.', 1),
  ('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', '8 a. m. a 8 p. m.',  2);

insert into public.pases_visita (id, residente_id, unidad_id, nombre_visitante, fecha_visita, hora_estimada) values
  ('70000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
   'Tomás Vega', (now() at time zone 'America/Lima')::date, '16:30');

insert into public.incidencias (id, reportado_por, unidad_id, ubicacion, descripcion) values
  ('80000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
   'Dpto A-101', 'El foco del pasillo del primer piso está quemado.');

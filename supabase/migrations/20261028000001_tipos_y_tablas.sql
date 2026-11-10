-- =====================================================================
-- NeighborGood · Parte 1 de 6: tipos enumerados y tablas
-- Fuente: docs/db_diagram/diagrama-database_dbdiagramio (21 tablas propias).
-- Esta parte crea la estructura con sus llaves primarias, foráneas, únicas,
-- valores por defecto y NOT NULL. Los CHECK y los índices van en la parte 2;
-- las funciones y triggers, en la 3; RLS y permisos, en la 5.
-- Se ejecuta completa, en una sola transacción.
--
-- Convención de lectura: cada campo que es llave foránea lleva al costado
-- `-- FK → tabla.columna`, y antes de cada tabla una línea "Relaciones" dice de
-- qué tablas depende y qué tablas la referencian.
-- =====================================================================
begin;

-- ───────────── Tipos enumerados ─────────────
create type public.rol_usuario            as enum ('directiva', 'residente', 'guardia');
create type public.tipo_sector            as enum ('torre', 'pabellon', 'manzana');
create type public.plataforma_dispositivo as enum ('android', 'ios');
create type public.prioridad_encuesta     as enum ('normal', 'alta');  -- alta = encuesta obligatoria
create type public.tipo_seleccion         as enum ('unica', 'multiple');
create type public.estado_pase            as enum ('vigente', 'usado', 'anulado');
create type public.tipo_alerta            as enum ('medica', 'incendio', 'seguridad');
create type public.estado_alerta          as enum ('activa', 'en_camino', 'atendida');
create type public.estado_incidencia      as enum ('pendiente', 'en_atencion', 'resuelto');

-- ───────────── A. Estructura del condominio ─────────────
-- Torre, pabellón o manzana: agrupa unidades y define a quién llegan avisos y alertas.
-- Relaciones: la referencian unidades, aviso_sectores, encuesta_sectores, alertas.
create table public.sectores (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo   public.tipo_sector not null,
  constraint uq_sectores_tipo_nombre unique (tipo, nombre)
);

-- Departamento o unidad de un sector. La ubicación de una alerta es la de su unidad.
-- Relaciones: depende de sectores; la referencian perfiles, residentes_habilitados, votos,
--   pases_visita, alertas, incidencias.
create table public.unidades (
  id         uuid primary key default gen_random_uuid(),
  sector_id  uuid not null references public.sectores (id),  -- FK → sectores.id
  codigo     text not null,                       -- Ej. Dpto 302
  habilitada boolean not null default true,
  constraint uq_unidades_sector_codigo unique (sector_id, codigo)
);

-- ───────────── B. Usuarios y accesos ─────────────
-- perfiles va antes que residentes_habilitados porque esa tabla la referencia.
-- Datos del usuario (rol, unidad, estado); comparte id con auth.users. Las políticas RLS (parte
-- 5) leen su rol.
-- Relaciones: depende de auth.users, unidades; la referencian residentes_habilitados,
--   registros_sesion, contactos_emergencia, dispositivos, avisos, encuestas, votos,
--   pases_visita, alertas, alerta_atenciones, incidencias.
create table public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,  -- FK → auth.users.id (borrado en cascada) · mismo id que auth.users
  unidad_id uuid references public.unidades (id),  -- FK → unidades.id · NULL para directiva y guardia
  nombre    text not null,
  apellido  text not null,
  telefono  text,
  rol       public.rol_usuario not null,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Pre-registro hecho por la directiva: solo estos correos pueden registrarse como residentes.
-- Relaciones: depende de unidades, perfiles.
create table public.residentes_habilitados (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null references public.unidades (id),  -- FK → unidades.id
  nombre     text not null,
  correo     text not null unique,
  creado_por uuid not null references public.perfiles (id),  -- FK → perfiles.id
  registrado boolean not null default false,
  creado_en  timestamptz not null default now()
);

-- Una fila por inicio de sesión (RF6); la inserta la app al iniciar sesión.
-- Relaciones: depende de perfiles.
create table public.registros_sesion (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,  -- FK → perfiles.id (borrado en cascada)
  iniciado_en timestamptz not null default now()
);

-- Hasta 3 contactos de emergencia por usuario (RF4).
-- Relaciones: depende de perfiles.
create table public.contactos_emergencia (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,  -- FK → perfiles.id (borrado en cascada)
  nombre     text not null,
  telefono   text not null,
  parentesco text,
  correo     text,                                 -- opcional: lo usará la próxima feature de correo de alerta
  orden      smallint not null,
  constraint uq_contactos_usuario_orden unique (usuario_id, orden)
);

-- Tokens de Expo Push de cada celular del usuario, para enviar notificaciones (RF21, RF25).
-- Relaciones: depende de perfiles.
create table public.dispositivos (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.perfiles (id) on delete cascade,  -- FK → perfiles.id (borrado en cascada)
  expo_push_token text not null unique,
  plataforma      public.plataforma_dispositivo not null,
  actualizado_en  timestamptz not null default now()
);

-- ───────────── C. Avisos y encuestas ─────────────
-- Catálogo de categorías de avisos y encuestas (RF10).
-- Relaciones: la referencian avisos, encuestas.
create table public.categorias_aviso (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- Comunicados de la directiva con vigencia e imagen opcional (RF7).
-- Relaciones: depende de perfiles, categorias_aviso; la referencian aviso_sectores.
create table public.avisos (
  id            uuid primary key default gen_random_uuid(),
  autor_id      uuid not null references public.perfiles (id),  -- FK → perfiles.id
  categoria_id  uuid not null references public.categorias_aviso (id),  -- FK → categorias_aviso.id
  para_todos    boolean not null default true,     -- true = todo el condominio (aviso_sectores queda vacía)
  titulo        text not null,
  descripcion   text not null,
  imagen_path   text,                              -- ruta en Supabase Storage
  vigente_desde timestamptz not null,
  vigente_hasta timestamptz not null,
  creado_en     timestamptz not null default now()
);

-- Sectores destino de un aviso cuando para_todos es false (RF13).
-- Relaciones: depende de avisos, sectores.
create table public.aviso_sectores (
  aviso_id  uuid not null references public.avisos (id) on delete cascade,  -- FK → avisos.id (borrado en cascada)
  sector_id uuid not null references public.sectores (id),  -- FK → sectores.id
  primary key (aviso_id, sector_id)
);

-- Encuesta de la directiva: prioridad, apertura, cierre y resultados en vivo (RF8, RF12, RF14).
-- Relaciones: depende de perfiles, categorias_aviso; la referencian encuesta_sectores,
--   encuesta_preguntas, votos.
create table public.encuestas (
  id                 uuid primary key default gen_random_uuid(),
  autor_id           uuid not null references public.perfiles (id),  -- FK → perfiles.id
  categoria_id       uuid not null references public.categorias_aviso (id),  -- FK → categorias_aviso.id
  para_todos         boolean not null default true,  -- true = todo el condominio (encuesta_sectores queda vacía)
  titulo             text not null,
  descripcion        text,
  prioridad          public.prioridad_encuesta not null default 'normal',
  resultados_en_vivo boolean not null default false, -- false = resultados visibles solo al cierre
  abre_en            timestamptz not null,
  cierra_en          timestamptz not null,
  creado_en          timestamptz not null default now()
);

-- Sectores destino de una encuesta cuando para_todos es false (RF13).
-- Relaciones: depende de encuestas, sectores.
create table public.encuesta_sectores (
  encuesta_id uuid not null references public.encuestas (id) on delete cascade,  -- FK → encuestas.id (borrado en cascada)
  sector_id   uuid not null references public.sectores (id),  -- FK → sectores.id
  primary key (encuesta_id, sector_id)
);

-- Preguntas de una encuesta, de selección única o múltiple (RF8).
-- Relaciones: depende de encuestas; la referencian encuesta_opciones.
create table public.encuesta_preguntas (
  id          uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas (id) on delete cascade,  -- FK → encuestas.id (borrado en cascada)
  texto       text not null,
  seleccion   public.tipo_seleccion not null default 'unica',
  orden       smallint not null,
  constraint uq_preguntas_encuesta_orden unique (encuesta_id, orden)
);

-- Opciones de respuesta de cada pregunta (RF8).
-- Relaciones: depende de encuesta_preguntas; la referencian voto_opciones.
create table public.encuesta_opciones (
  id          uuid primary key default gen_random_uuid(),
  pregunta_id uuid not null references public.encuesta_preguntas (id) on delete cascade,  -- FK → encuesta_preguntas.id (borrado en cascada)
  texto       text not null,
  orden       smallint not null,
  constraint uq_opciones_pregunta_orden unique (pregunta_id, orden),
  constraint uq_opciones_id_pregunta unique (id, pregunta_id)  -- permite la llave foránea compuesta de voto_opciones
);

-- Un voto agrupa las respuestas a todas las preguntas, enviadas en un solo envío.
-- Relaciones: depende de encuestas, unidades, perfiles; la referencian voto_opciones.
create table public.votos (
  id          uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas (id),  -- FK → encuestas.id
  unidad_id   uuid not null references public.unidades (id),  -- FK → unidades.id
  usuario_id  uuid not null references public.perfiles (id),  -- FK → perfiles.id · residente que votó en nombre de la unidad
  creado_en   timestamptz not null default now(),
  constraint uq_votos_encuesta_unidad unique (encuesta_id, unidad_id)  -- un voto por unidad y encuesta
);

-- Opciones elegidas en cada voto (RF9).
-- Relaciones: depende de votos, encuesta_opciones.
create table public.voto_opciones (
  voto_id     uuid not null references public.votos (id) on delete cascade,  -- FK → votos.id (borrado en cascada)
  pregunta_id uuid not null,  -- FK compuesta → encuesta_opciones (id, pregunta_id)
  opcion_id   uuid not null,  -- FK compuesta → encuesta_opciones (id, pregunta_id)
  primary key (voto_id, opcion_id),
  -- FK compuesta → encuesta_opciones (id, pregunta_id): garantiza que la opción pertenezca a la pregunta.
  constraint fk_voto_opciones_opcion_pregunta
    foreign key (opcion_id, pregunta_id) references public.encuesta_opciones (id, pregunta_id)
);

-- ───────────── D. Visitas ─────────────
-- El id (UUID v4) es el código que lleva el QR. El estado "vencido" no se guarda:
-- la Edge Function lo calcula al escanear (fecha_visita anterior al día actual en America/Lima).
-- Relaciones: depende de perfiles, unidades.
create table public.pases_visita (
  id               uuid primary key default gen_random_uuid(),
  residente_id     uuid not null references public.perfiles (id),  -- FK → perfiles.id
  unidad_id        uuid not null references public.unidades (id),  -- FK → unidades.id
  nombre_visitante text not null,
  fecha_visita     date not null,                  -- el pase solo vale este día
  hora_estimada    time,
  estado           public.estado_pase not null default 'vigente',
  guardia_id       uuid references public.perfiles (id),  -- FK → perfiles.id · guardia que validó el ingreso
  ingreso_en       timestamptz,
  salida_en        timestamptz,
  anulado_en       timestamptz,
  creado_en        timestamptz not null default now()
);

-- ───────────── E. Alertas ─────────────
-- Alerta de pánico: tipo, estado y unidad de origen (RF23 a RF25).
-- Relaciones: depende de perfiles, unidades, sectores; la referencian alerta_atenciones.
create table public.alertas (
  id        uuid primary key default gen_random_uuid(),
  emisor_id uuid not null references public.perfiles (id),  -- FK → perfiles.id
  unidad_id uuid not null references public.unidades (id),  -- FK → unidades.id · la ubicación de la alerta es la de esta unidad
  sector_id uuid not null references public.sectores (id),  -- FK → sectores.id · copia del sector de la unidad (la llena un trigger)
  tipo      public.tipo_alerta not null,
  estado    public.estado_alerta not null default 'activa',
  creada_en timestamptz not null default now()
);

-- Bitácora de respuestas del personal a cada alerta.
-- Relaciones: depende de alertas, perfiles.
create table public.alerta_atenciones (
  id         uuid primary key default gen_random_uuid(),
  alerta_id  uuid not null references public.alertas (id) on delete cascade,  -- FK → alertas.id (borrado en cascada)
  usuario_id uuid not null references public.perfiles (id),  -- FK → perfiles.id · directiva o guardia que responde
  estado     public.estado_alerta not null,                  -- solo en_camino o atendida
  creado_en  timestamptz not null default now()
);

-- ───────────── F. Incidencias ─────────────
-- Reporte de un residente con ubicación y estado (RF29, RF30).
-- Relaciones: depende de perfiles, unidades; la referencian incidencia_fotos.
create table public.incidencias (
  id             uuid primary key default gen_random_uuid(),
  reportado_por  uuid not null references public.perfiles (id),  -- FK → perfiles.id
  unidad_id      uuid not null references public.unidades (id),  -- FK → unidades.id
  ubicacion      text not null,                    -- se precarga con la unidad y el residente puede editarla
  descripcion    text not null,
  estado         public.estado_incidencia not null default 'pendiente',
  atendido_por   uuid references public.perfiles (id),  -- FK → perfiles.id
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  resuelta_en    timestamptz
);

-- Fotos de una incidencia, de 1 a 3 (RF29).
-- Relaciones: depende de incidencias.
create table public.incidencia_fotos (
  id            uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references public.incidencias (id) on delete cascade,  -- FK → incidencias.id (borrado en cascada)
  foto_path     text not null,                     -- ruta en Supabase Storage
  orden         smallint not null,
  constraint uq_fotos_incidencia_orden unique (incidencia_id, orden)
);

commit;

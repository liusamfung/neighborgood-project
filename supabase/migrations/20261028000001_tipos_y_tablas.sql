-- =====================================================================
-- NeighborGood · Parte 1 de 6: tipos enumerados y tablas
-- Fuente: docs/db_diagram/diagrama-database_dbdiagramio (21 tablas propias).
-- Esta parte crea la estructura con sus llaves primarias, foráneas, únicas,
-- valores por defecto y NOT NULL. Los CHECK y los índices van en la parte 2;
-- las funciones y triggers, en la 3; RLS y permisos, en la 5.
-- Se ejecuta completa, en una sola transacción.
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
create table public.sectores (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo   public.tipo_sector not null,
  constraint uq_sectores_tipo_nombre unique (tipo, nombre)
);

create table public.unidades (
  id         uuid primary key default gen_random_uuid(),
  sector_id  uuid not null references public.sectores (id),
  codigo     text not null,                       -- Ej. Dpto 302
  habilitada boolean not null default true,
  constraint uq_unidades_sector_codigo unique (sector_id, codigo)
);

-- ───────────── B. Usuarios y accesos ─────────────
-- perfiles va antes que residentes_habilitados porque esa tabla la referencia.
create table public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,  -- mismo id que auth.users
  unidad_id uuid references public.unidades (id),                           -- NULL para directiva y guardia
  nombre    text not null,
  apellido  text not null,
  telefono  text,
  rol       public.rol_usuario not null,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Pre-registro hecho por la directiva: solo estos correos pueden registrarse como residentes.
create table public.residentes_habilitados (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null references public.unidades (id),
  nombre     text not null,
  correo     text not null unique,
  creado_por uuid not null references public.perfiles (id),
  registrado boolean not null default false,
  creado_en  timestamptz not null default now()
);

create table public.registros_sesion (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  iniciado_en timestamptz not null default now()
);

create table public.contactos_emergencia (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  nombre     text not null,
  telefono   text not null,
  parentesco text,
  correo     text,                                 -- opcional: lo usará la próxima feature de correo de alerta
  orden      smallint not null,
  constraint uq_contactos_usuario_orden unique (usuario_id, orden)
);

create table public.dispositivos (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.perfiles (id) on delete cascade,
  expo_push_token text not null unique,
  plataforma      public.plataforma_dispositivo not null,
  actualizado_en  timestamptz not null default now()
);

-- ───────────── C. Avisos y encuestas ─────────────
create table public.categorias_aviso (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.avisos (
  id            uuid primary key default gen_random_uuid(),
  autor_id      uuid not null references public.perfiles (id),
  categoria_id  uuid not null references public.categorias_aviso (id),
  para_todos    boolean not null default true,     -- true = todo el condominio (aviso_sectores queda vacía)
  titulo        text not null,
  descripcion   text not null,
  imagen_path   text,                              -- ruta en Supabase Storage
  vigente_desde timestamptz not null,
  vigente_hasta timestamptz not null,
  creado_en     timestamptz not null default now()
);

create table public.aviso_sectores (
  aviso_id  uuid not null references public.avisos (id) on delete cascade,
  sector_id uuid not null references public.sectores (id),
  primary key (aviso_id, sector_id)
);

create table public.encuestas (
  id                 uuid primary key default gen_random_uuid(),
  autor_id           uuid not null references public.perfiles (id),
  categoria_id       uuid not null references public.categorias_aviso (id),
  para_todos         boolean not null default true,  -- true = todo el condominio (encuesta_sectores queda vacía)
  titulo             text not null,
  descripcion        text,
  prioridad          public.prioridad_encuesta not null default 'normal',
  resultados_en_vivo boolean not null default false, -- false = resultados visibles solo al cierre
  abre_en            timestamptz not null,
  cierra_en          timestamptz not null,
  creado_en          timestamptz not null default now()
);

create table public.encuesta_sectores (
  encuesta_id uuid not null references public.encuestas (id) on delete cascade,
  sector_id   uuid not null references public.sectores (id),
  primary key (encuesta_id, sector_id)
);

create table public.encuesta_preguntas (
  id          uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas (id) on delete cascade,
  texto       text not null,
  seleccion   public.tipo_seleccion not null default 'unica',
  orden       smallint not null,
  constraint uq_preguntas_encuesta_orden unique (encuesta_id, orden)
);

create table public.encuesta_opciones (
  id          uuid primary key default gen_random_uuid(),
  pregunta_id uuid not null references public.encuesta_preguntas (id) on delete cascade,
  texto       text not null,
  orden       smallint not null,
  constraint uq_opciones_pregunta_orden unique (pregunta_id, orden),
  constraint uq_opciones_id_pregunta unique (id, pregunta_id)  -- permite la llave foránea compuesta de voto_opciones
);

-- Un voto agrupa las respuestas a todas las preguntas, enviadas en un solo envío.
create table public.votos (
  id          uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas (id),
  unidad_id   uuid not null references public.unidades (id),
  usuario_id  uuid not null references public.perfiles (id),  -- residente que votó en nombre de la unidad
  creado_en   timestamptz not null default now(),
  constraint uq_votos_encuesta_unidad unique (encuesta_id, unidad_id)  -- un voto por unidad y encuesta
);

create table public.voto_opciones (
  voto_id     uuid not null references public.votos (id) on delete cascade,
  pregunta_id uuid not null,
  opcion_id   uuid not null,
  primary key (voto_id, opcion_id),
  -- La llave compuesta garantiza que la opción pertenezca a la pregunta.
  constraint fk_voto_opciones_opcion_pregunta
    foreign key (opcion_id, pregunta_id) references public.encuesta_opciones (id, pregunta_id)
);

-- ───────────── D. Visitas ─────────────
-- El id (UUID v4) es el código que lleva el QR. El estado "vencido" no se guarda:
-- la Edge Function lo calcula al escanear (fecha_visita anterior al día actual en America/Lima).
create table public.pases_visita (
  id               uuid primary key default gen_random_uuid(),
  residente_id     uuid not null references public.perfiles (id),
  unidad_id        uuid not null references public.unidades (id),
  nombre_visitante text not null,
  fecha_visita     date not null,                  -- el pase solo vale este día
  hora_estimada    time,
  estado           public.estado_pase not null default 'vigente',
  guardia_id       uuid references public.perfiles (id),  -- guardia que validó el ingreso
  ingreso_en       timestamptz,
  salida_en        timestamptz,
  anulado_en       timestamptz,
  creado_en        timestamptz not null default now()
);

-- ───────────── E. Alertas ─────────────
create table public.alertas (
  id        uuid primary key default gen_random_uuid(),
  emisor_id uuid not null references public.perfiles (id),
  unidad_id uuid not null references public.unidades (id),   -- la ubicación de la alerta es la de esta unidad
  sector_id uuid not null references public.sectores (id),   -- copia del sector de la unidad (la llena un trigger)
  tipo      public.tipo_alerta not null,
  estado    public.estado_alerta not null default 'activa',
  creada_en timestamptz not null default now()
);

-- Bitácora de respuestas del personal a cada alerta.
create table public.alerta_atenciones (
  id         uuid primary key default gen_random_uuid(),
  alerta_id  uuid not null references public.alertas (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id),  -- directiva o guardia que responde
  estado     public.estado_alerta not null,                  -- solo en_camino o atendida
  creado_en  timestamptz not null default now()
);

-- ───────────── F. Incidencias ─────────────
create table public.incidencias (
  id             uuid primary key default gen_random_uuid(),
  reportado_por  uuid not null references public.perfiles (id),
  unidad_id      uuid not null references public.unidades (id),
  ubicacion      text not null,                    -- se precarga con la unidad y el residente puede editarla
  descripcion    text not null,
  estado         public.estado_incidencia not null default 'pendiente',
  atendido_por   uuid references public.perfiles (id),
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  resuelta_en    timestamptz
);

create table public.incidencia_fotos (
  id            uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references public.incidencias (id) on delete cascade,
  foto_path     text not null,                     -- ruta en Supabase Storage
  orden         smallint not null,
  constraint uq_fotos_incidencia_orden unique (incidencia_id, orden)
);

commit;

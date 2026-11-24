-- =====================================================================
-- NeighborGood · RNF5 (escalabilidad) · datos sintéticos para la prueba de carga
--
-- Qué hace: llena la base LOCAL con el tamaño de un condominio grande (el umbral del RNF5: hasta 500
--   unidades) y un año de actividad, para medir después cuánto tardan las consultas de la app.
--   Crea 10 sectores y 500 unidades nuevas (más las 12 del seed), 1 000 residentes (2 por unidad),
--   300 avisos, 50 000 pases de visita, 10 000 alertas (con sus respuestas) y 10 000 incidencias.
-- Cómo funciona: los ids salen de `md5(...)::uuid`, así que son siempre los mismos; la "suerte" sale de
--   `hashtext`, así que dos ejecuciones dan los mismos datos. Todo corre en una sola transacción
--   (`psql -1`): si algo falla, no queda nada a medias. Los triggers de usuario de las tablas grandes se
--   apagan mientras se cargan (los trae el seed; recalcularían estados que ya damos listos) y se
--   encienden al final.
-- Seguridad: SOLO para el Supabase local de Docker. Se niega a correr si no encuentra al usuario del seed
--   (`directiva@neighborgood.test`), que nunca existe en el proyecto real.
-- Se relaciona con: `medir.sql` y `concurrencia.pgbench` (miden sobre estos datos), `supabase/seed.sql`
--   (debe estar cargado: usa a la directiva y al guardia) y `docs/pruebas/RNF.md` (donde se anotan los
--   resultados). Se ejecuta con `npm run carga:preparar`.
-- =====================================================================

-- Protección: aborta si esto no es la base local de pruebas.
do $$
begin
  if not exists (select 1 from auth.users where email = 'directiva@neighborgood.test') then
    raise exception 'Este script solo corre en el Supabase local con el seed cargado (supabase db reset).';
  end if;
  if exists (select 1 from public.unidades where codigo like 'T%-%') then
    raise exception 'Los datos de carga ya existen. Ejecuta `npm run db:reset` antes de volver a generarlos.';
  end if;
end $$;

-- Los triggers de usuario se apagan solo en las tablas que se cargan en masa.
alter table public.pases_visita      disable trigger user;
alter table public.alertas           disable trigger user;
alter table public.alerta_atenciones disable trigger user;
alter table public.incidencias       disable trigger user;

-- ───────────── Sectores y unidades: 10 sectores × 50 unidades = 500 unidades ─────────────
-- sectores.id lo calculamos con md5 para poder referirlo después sin guardarlo.
insert into public.sectores (id, nombre, tipo)
select md5('carga-sector-' || s)::uuid, 'Torre carga ' || s, 'torre'
from generate_series(1, 10) s;

-- unidades.sector_id → sectores.id
insert into public.unidades (id, sector_id, codigo)
select md5('carga-unidad-' || s || '-' || n)::uuid,
       md5('carga-sector-' || s)::uuid,
       'T' || s || '-' || lpad(n::text, 3, '0')
from generate_series(1, 10) s, generate_series(1, 50) n;

-- ───────────── Residentes: 2 por unidad = 1 000 usuarios ─────────────
-- Tabla temporal con la lista numerada de residentes: las demás cargas la usan para elegir un autor al
-- azar (pero siempre el mismo) con `hashtext`. Desaparece al terminar la sesión.
create temp table residentes_carga as
select row_number() over (order by s, n, k)::int as num,
       md5('carga-res-' || s || '-' || n || '-' || k)::uuid as id,
       md5('carga-unidad-' || s || '-' || n)::uuid          as unidad_id,
       md5('carga-sector-' || s)::uuid                      as sector_id
from generate_series(1, 10) s, generate_series(1, 50) n, generate_series(1, 2) k;

-- Cuentas de Supabase Auth mínimas (sin contraseña usable: la prueba no inicia sesión, suplanta el JWT).
-- El trigger de registro no crea perfil porque el correo no está habilitado; los perfiles van abajo.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated',
       'carga' || r.num || '@neighborgood.test', 'sin-contrasena', now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from residentes_carga r;

-- perfiles.id → auth.users.id · perfiles.unidad_id → unidades.id
insert into public.perfiles (id, unidad_id, nombre, apellido, rol)
select r.id, r.unidad_id, 'Residente ' || r.num, 'Carga', 'residente'
from residentes_carga r;

-- ───────────── Avisos: 300 en el año, cerca de 40 vigentes hoy ─────────────
-- avisos.autor_id → perfiles.id (la directiva del seed) · avisos.categoria_id → categorias_aviso.id
-- Un aviso dura entre 7 y 97 días; el 30 % es solo para un sector.
insert into public.avisos (id, autor_id, categoria_id, para_todos, titulo, descripcion, vigente_desde, vigente_hasta)
select md5('carga-aviso-' || g)::uuid,
       '90000000-0000-0000-0000-000000000001',
       ('40000000-0000-0000-0000-00000000000' || (1 + abs(hashtext('ac' || g)) % 5))::uuid,
       (abs(hashtext('ap' || g)) % 10) >= 3,
       'Aviso de carga ' || g,
       'Descripción de prueba del aviso ' || g || ' para medir el tamaño de la lista.',
       now() - make_interval(days => abs(hashtext('ad' || g)) % 365),
       now() - make_interval(days => abs(hashtext('ad' || g)) % 365) + make_interval(days => 7 + abs(hashtext('ah' || g)) % 90)
from generate_series(1, 300) g;

-- aviso_sectores.aviso_id → avisos.id · aviso_sectores.sector_id → sectores.id
insert into public.aviso_sectores (aviso_id, sector_id)
select a.id, md5('carga-sector-' || (1 + abs(hashtext('as' || a.id::text)) % 10))::uuid
from public.avisos a
where not a.para_todos and a.titulo like 'Aviso de carga %';

-- ───────────── Pases de visita: 50 000 (unos 137 por día) ─────────────
-- pases_visita.residente_id → perfiles.id · pases_visita.unidad_id → unidades.id
--   · pases_visita.guardia_id → perfiles.id (el guardia del seed)
-- Los de días pasados quedan "usado" (con guardia y hora de ingreso, como exige la restricción
-- `ck_pases_estado_coherente`); los de hoy, "vigente" (son los que ve el guardia).
insert into public.pases_visita (id, residente_id, unidad_id, nombre_visitante, fecha_visita, hora_estimada, estado,
                                 guardia_id, ingreso_en, creado_en)
select md5('carga-pase-' || g)::uuid,
       r.id, r.unidad_id,
       'Visitante ' || g,
       d.dia,
       make_time(8 + abs(hashtext('ph' || g)) % 12, 0, 0),
       case when d.dia = (now() at time zone 'America/Lima')::date then 'vigente' else 'usado' end::public.estado_pase,
       case when d.dia = (now() at time zone 'America/Lima')::date then null
            else '90000000-0000-0000-0000-000000000002'::uuid end,
       case when d.dia = (now() at time zone 'America/Lima')::date then null
            else d.dia::timestamptz + interval '10 hours' end,
       d.dia::timestamptz
from generate_series(1, 50000) g
cross join lateral (select (now() at time zone 'America/Lima')::date - (abs(hashtext('pf' || g)) % 365) as dia) d
join residentes_carga r on r.num = 1 + abs(hashtext('pr' || g)) % 1000;

-- ───────────── Alertas: 10 000 en el año, con sus respuestas ─────────────
-- alertas.emisor_id → perfiles.id · alertas.unidad_id → unidades.id · alertas.sector_id → sectores.id
-- Las de hace más de un día ya están atendidas; las de hoy, activas.
insert into public.alertas (id, emisor_id, unidad_id, sector_id, tipo, estado, creada_en)
select md5('carga-alerta-' || g)::uuid,
       r.id, r.unidad_id, r.sector_id,
       (array['medica', 'incendio', 'seguridad'])[1 + abs(hashtext('at' || g)) % 3]::public.tipo_alerta,
       case when t.creada < now() - interval '1 day' then 'atendida' else 'activa' end::public.estado_alerta,
       t.creada
from generate_series(1, 10000) g
cross join lateral (select now() - make_interval(days => abs(hashtext('af' || g)) % 365, secs => abs(hashtext('as' || g)) % 86400) as creada) t
join residentes_carga r on r.num = 1 + abs(hashtext('ar' || g)) % 1000;

-- alerta_atenciones.alerta_id → alertas.id · alerta_atenciones.usuario_id → perfiles.id (el guardia)
insert into public.alerta_atenciones (alerta_id, usuario_id, estado, creado_en)
select a.id, '90000000-0000-0000-0000-000000000002', e.estado::public.estado_alerta, a.creada_en + e.demora
from public.alertas a
cross join (values ('en_camino', interval '1 minute'), ('atendida', interval '4 minutes')) as e(estado, demora)
where a.estado = 'atendida' and a.emisor_id in (select id from residentes_carga);

-- ───────────── Incidencias: 10 000 en el año ─────────────
-- incidencias.reportado_por → perfiles.id · incidencias.unidad_id → unidades.id
-- Las de hace más de 30 días ya están resueltas; el resto se reparte entre pendiente y en atención.
insert into public.incidencias (id, reportado_por, unidad_id, ubicacion, descripcion, estado, creada_en, actualizada_en)
select md5('carga-incidencia-' || g)::uuid,
       r.id, r.unidad_id,
       'Pasillo del piso ' || (1 + abs(hashtext('iu' || g)) % 12),
       'Incidencia de prueba ' || g,
       (case when t.creada < now() - interval '30 days' then 'resuelto'
             when abs(hashtext('ie' || g)) % 2 = 0 then 'pendiente'
             else 'en_atencion' end)::public.estado_incidencia,
       t.creada, t.creada
from generate_series(1, 10000) g
cross join lateral (select now() - make_interval(days => abs(hashtext('if' || g)) % 365, secs => abs(hashtext('is' || g)) % 86400) as creada) t
join residentes_carga r on r.num = 1 + abs(hashtext('ir' || g)) % 1000;

-- Se vuelven a encender los triggers y se actualizan las estadísticas del planificador, como haría
-- Postgres en un uso real después de cargar tanto dato.
alter table public.pases_visita      enable trigger user;
alter table public.alertas           enable trigger user;
alter table public.alerta_atenciones enable trigger user;
alter table public.incidencias       enable trigger user;
analyze public.unidades, public.perfiles, public.avisos, public.pases_visita, public.alertas,
        public.alerta_atenciones, public.incidencias;

-- Resumen de lo cargado.
select 'unidades' as tabla, count(*) as filas from public.unidades
union all select 'perfiles (residentes)', count(*) from public.perfiles where rol = 'residente'
union all select 'avisos',               count(*) from public.avisos
union all select 'pases_visita',         count(*) from public.pases_visita
union all select 'alertas',              count(*) from public.alertas
union all select 'alerta_atenciones',    count(*) from public.alerta_atenciones
union all select 'incidencias',          count(*) from public.incidencias;

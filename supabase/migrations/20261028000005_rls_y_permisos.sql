-- =====================================================================
-- NeighborGood · Parte 5 de 6: RLS, permisos (GRANT) y políticas por rol
--
-- Dos capas que se complementan:
--   1. GRANT: el techo de lo que cada rol de base de datos puede intentar.
--   2. Políticas RLS: filtran qué filas puede ver o escribir cada usuario.
--
-- Se pidió en el panel de Supabase NO exponer las tablas nuevas automáticamente
-- ("Automatically expose new tables"), así que aquí todo se otorga de forma explícita.
-- `anon` (sin sesión) no recibe ningún permiso. `service_role` (solo las Edge Functions)
-- se salta RLS, pero igual necesita sus GRANT sobre las tablas.
--
-- Roles de la app: directiva, residente y guardia (perfiles.rol). Un usuario sin perfil
-- o con perfil inactivo no ve ni escribe nada.
-- =====================================================================
begin;

-- ───────────── 1. Activar RLS en las 21 tablas ─────────────
alter table public.sectores               enable row level security;
alter table public.unidades               enable row level security;
alter table public.perfiles               enable row level security;
alter table public.residentes_habilitados enable row level security;
alter table public.registros_sesion       enable row level security;
alter table public.contactos_emergencia   enable row level security;
alter table public.dispositivos           enable row level security;
alter table public.categorias_aviso       enable row level security;
alter table public.avisos                 enable row level security;
alter table public.aviso_sectores         enable row level security;
alter table public.encuestas              enable row level security;
alter table public.encuesta_sectores      enable row level security;
alter table public.encuesta_preguntas     enable row level security;
alter table public.encuesta_opciones      enable row level security;
alter table public.votos                  enable row level security;
alter table public.voto_opciones          enable row level security;
alter table public.pases_visita           enable row level security;
alter table public.alertas                enable row level security;
alter table public.alerta_atenciones      enable row level security;
alter table public.incidencias            enable row level security;
alter table public.incidencia_fotos       enable row level security;

-- ───────────── 2. Permisos (GRANT) ─────────────
-- Se parte de cero, sin depender de los permisos por defecto de Supabase.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

-- Estructura y catálogos: todos leen, la directiva escribe (lo decide la política).
grant select, insert, update, delete on public.sectores, public.unidades, public.categorias_aviso to authenticated;
grant select, insert, update, delete on public.residentes_habilitados to authenticated;

-- Perfiles: se crean con el trigger de registro o a mano; no se borran (la baja es activo = false).
grant select, update on public.perfiles to authenticated;
grant select, insert on public.registros_sesion to authenticated;
grant select, insert, update, delete on public.contactos_emergencia, public.dispositivos to authenticated;

-- Avisos y encuestas: la directiva los gestiona; los residentes votan solo con la función emitir_voto.
grant select, insert, update, delete on
  public.avisos, public.aviso_sectores, public.encuestas, public.encuesta_sectores,
  public.encuesta_preguntas, public.encuesta_opciones to authenticated;
grant select on public.votos, public.voto_opciones to authenticated;

-- Pases: los crea y valida una Edge Function (service_role). El residente solo puede cambiar el estado (anular).
grant select on public.pases_visita to authenticated;
grant update (estado) on public.pases_visita to authenticated;

-- Alertas: el residente solo informa unidad, tipo y emisor; estado, sector y hora los fijan los triggers.
grant select on public.alertas to authenticated;
grant insert (emisor_id, unidad_id, tipo) on public.alertas to authenticated;
grant select on public.alerta_atenciones to authenticated;
grant insert (alerta_id, usuario_id, estado) on public.alerta_atenciones to authenticated;

-- Incidencias: la directiva solo cambia el estado; las fechas y el responsable los fija el trigger.
grant select, insert on public.incidencias, public.incidencia_fotos to authenticated;
grant update (estado) on public.incidencias to authenticated;

grant select on public.reporte_incidencias_mensual to authenticated;

-- Edge Functions: acceso total (se salta RLS, pero necesita los permisos sobre las tablas).
grant all on all tables in schema public to service_role;

-- ───────────── 3. Políticas RLS ─────────────
-- Todas son TO authenticated y usan (select auth.uid()) para que Postgres evalúe el id una sola vez.

-- ── sectores, unidades, categorias_aviso: leen todos los usuarios activos; escribe la directiva ──
create policy "sectores: leen los usuarios activos" on public.sectores
  for select to authenticated using (privado.es_usuario_activo());
create policy "sectores: la directiva gestiona" on public.sectores
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

create policy "unidades: leen los usuarios activos" on public.unidades
  for select to authenticated using (privado.es_usuario_activo());
create policy "unidades: la directiva gestiona" on public.unidades
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

create policy "categorias_aviso: leen los usuarios activos" on public.categorias_aviso
  for select to authenticated using (privado.es_usuario_activo());
create policy "categorias_aviso: la directiva gestiona" on public.categorias_aviso
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

-- ── residentes_habilitados: solo la directiva (los demás no ven la lista de correos) ──
create policy "residentes_habilitados: la directiva gestiona" on public.residentes_habilitados
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

-- ── perfiles ──
-- Cada quien lee el suyo; la directiva lee todos; el guardia lee los de los residentes
-- (el detalle de una alerta muestra quién la envió).
create policy "perfiles: lectura" on public.perfiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or privado.es_directiva()
    or (privado.es_guardia() and rol = 'residente')
  );
-- Cada quien edita el suyo y la directiva edita todos; el trigger impide a los demás tocar rol, unidad o estado.
create policy "perfiles: actualización" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()) or privado.es_directiva())
  with check (id = (select auth.uid()) or privado.es_directiva());

-- ── registros_sesion ──
create policy "registros_sesion: lectura" on public.registros_sesion
  for select to authenticated
  using (usuario_id = (select auth.uid()) or privado.es_directiva());
create policy "registros_sesion: cada usuario registra el suyo" on public.registros_sesion
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and privado.es_usuario_activo());

-- ── contactos_emergencia ──
create policy "contactos_emergencia: lectura" on public.contactos_emergencia
  for select to authenticated
  using (usuario_id = (select auth.uid()) or privado.puede_ver_contactos(usuario_id));
create policy "contactos_emergencia: cada usuario agrega los suyos" on public.contactos_emergencia
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and privado.es_usuario_activo());
create policy "contactos_emergencia: cada usuario edita los suyos" on public.contactos_emergencia
  for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy "contactos_emergencia: cada usuario borra los suyos" on public.contactos_emergencia
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- ── dispositivos (tokens de Expo Push): cada usuario gestiona los suyos ──
create policy "dispositivos: cada usuario gestiona los suyos" on public.dispositivos
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and privado.es_usuario_activo());

-- ── avisos y aviso_sectores ──
create policy "avisos: lectura" on public.avisos
  for select to authenticated
  using (
    privado.es_directiva()
    or (privado.es_residente()
        and vigente_desde <= now()
        and (para_todos or privado.aviso_en_mi_sector(id)))
  );
create policy "avisos: la directiva publica" on public.avisos
  for insert to authenticated
  with check (privado.es_directiva() and autor_id = (select auth.uid()));
create policy "avisos: la directiva edita" on public.avisos
  for update to authenticated using (privado.es_directiva()) with check (privado.es_directiva());
create policy "avisos: la directiva borra" on public.avisos
  for delete to authenticated using (privado.es_directiva());

create policy "aviso_sectores: lectura" on public.aviso_sectores
  for select to authenticated using (privado.puede_ver_aviso(aviso_id));
create policy "aviso_sectores: la directiva gestiona" on public.aviso_sectores
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

-- ── encuestas y sus tablas hijas ──
create policy "encuestas: lectura" on public.encuestas
  for select to authenticated
  using (
    privado.es_directiva()
    or (privado.es_residente()
        and abre_en <= now()
        and (para_todos or privado.encuesta_en_mi_sector(id)))
  );
create policy "encuestas: la directiva publica" on public.encuestas
  for insert to authenticated
  with check (privado.es_directiva() and autor_id = (select auth.uid()));
create policy "encuestas: la directiva edita" on public.encuestas
  for update to authenticated using (privado.es_directiva()) with check (privado.es_directiva());
create policy "encuestas: la directiva borra" on public.encuestas
  for delete to authenticated using (privado.es_directiva());

create policy "encuesta_sectores: lectura" on public.encuesta_sectores
  for select to authenticated using (privado.puede_ver_encuesta(encuesta_id));
create policy "encuesta_sectores: la directiva gestiona" on public.encuesta_sectores
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

create policy "encuesta_preguntas: lectura" on public.encuesta_preguntas
  for select to authenticated using (privado.puede_ver_encuesta(encuesta_id));
create policy "encuesta_preguntas: la directiva gestiona" on public.encuesta_preguntas
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

create policy "encuesta_opciones: lectura" on public.encuesta_opciones
  for select to authenticated using (privado.puede_ver_pregunta(pregunta_id));
create policy "encuesta_opciones: la directiva gestiona" on public.encuesta_opciones
  for all to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

-- ── votos: se leen los de la propia unidad (para mostrar "Tu unidad ya votó"); se escriben con emitir_voto ──
create policy "votos: lectura" on public.votos
  for select to authenticated
  using (privado.es_directiva() or unidad_id = privado.unidad_actual());
create policy "voto_opciones: lectura" on public.voto_opciones
  for select to authenticated using (privado.puede_ver_voto(voto_id));

-- ── pases_visita ──
-- El residente ve los suyos; el guardia ve los de hoy (hora de Lima); la directiva ve todos.
create policy "pases_visita: lectura" on public.pases_visita
  for select to authenticated
  using (
    residente_id = (select auth.uid())
    or privado.es_directiva()
    or (privado.es_guardia() and fecha_visita = privado.hoy_lima())
  );
-- El residente solo puede anular un pase suyo que siga vigente (el trigger fija la hora).
create policy "pases_visita: el residente anula el suyo" on public.pases_visita
  for update to authenticated
  using (residente_id = (select auth.uid()) and estado = 'vigente')
  with check (residente_id = (select auth.uid()) and estado = 'anulado');

-- ── alertas ──
-- Las ve quien la emitió, los vecinos de su sector (RF25) y todo el personal.
create policy "alertas: lectura" on public.alertas
  for select to authenticated
  using (
    emisor_id = (select auth.uid())
    or privado.es_personal()
    or (privado.es_residente() and sector_id = privado.sector_actual())
  );
create policy "alertas: el residente emite desde su unidad" on public.alertas
  for insert to authenticated
  with check (
    privado.es_residente()
    and emisor_id = (select auth.uid())
    and unidad_id = privado.unidad_actual()
  );

create policy "alerta_atenciones: lectura" on public.alerta_atenciones
  for select to authenticated
  using (privado.es_personal() or privado.es_emisor_de(alerta_id));
create policy "alerta_atenciones: el personal responde" on public.alerta_atenciones
  for insert to authenticated
  with check (privado.es_personal() and usuario_id = (select auth.uid()));

-- ── incidencias ──
create policy "incidencias: lectura" on public.incidencias
  for select to authenticated
  using (reportado_por = (select auth.uid()) or privado.es_directiva());
create policy "incidencias: el residente reporta desde su unidad" on public.incidencias
  for insert to authenticated
  with check (
    privado.es_residente()
    and reportado_por = (select auth.uid())
    and unidad_id = privado.unidad_actual()
  );
create policy "incidencias: la directiva cambia el estado" on public.incidencias
  for update to authenticated using (privado.es_directiva()) with check (privado.es_directiva());

create policy "incidencia_fotos: lectura" on public.incidencia_fotos
  for select to authenticated using (privado.puede_ver_incidencia(incidencia_id));
create policy "incidencia_fotos: el dueño agrega las suyas" on public.incidencia_fotos
  for insert to authenticated with check (privado.es_dueno_de_incidencia(incidencia_id));

-- ───────────── 4. Realtime ─────────────
-- Las alertas llegan en vivo a las apps abiertas. Realtime respeta las políticas RLS de la
-- tabla: cada usuario recibe solo las alertas que podría leer.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alertas'
     ) then
    alter publication supabase_realtime add table public.alertas;
  end if;
end
$$;

commit;

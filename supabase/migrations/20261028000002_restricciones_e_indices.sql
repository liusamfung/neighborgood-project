-- =====================================================================
-- NeighborGood · Parte 2 de 6: restricciones CHECK e índices
-- Los CHECK son las reglas que el modelo dejó como notas; los índices son
-- los del modelo más los de las columnas que usan las políticas RLS.
-- =====================================================================
begin;

-- ───────────── CHECK ─────────────
-- Un residente siempre tiene unidad.
alter table public.perfiles
  add constraint ck_perfiles_residente_con_unidad
  check (rol <> 'residente' or unidad_id is not null);

-- El correo se guarda normalizado para poder compararlo con el de auth.users.
alter table public.residentes_habilitados
  add constraint ck_residentes_correo_normalizado
  check (correo = lower(btrim(correo)));

-- Máximo 3 contactos por usuario: lo imponen el rango de orden y la llave única (usuario_id, orden).
alter table public.contactos_emergencia
  add constraint ck_contactos_orden_1_a_3
  check (orden between 1 and 3);

alter table public.avisos
  add constraint ck_avisos_vigencia_valida
  check (vigente_hasta > vigente_desde);

alter table public.encuestas
  add constraint ck_encuestas_cierre_posterior
  check (cierra_en > abre_en);

-- Estado del pase y sus fechas deben ser coherentes (vencido no se guarda, se calcula).
alter table public.pases_visita
  add constraint ck_pases_estado_coherente
  check (
    (estado = 'vigente' and ingreso_en is null and salida_en is null and anulado_en is null and guardia_id is null)
    or (estado = 'usado' and ingreso_en is not null and guardia_id is not null and anulado_en is null
        and (salida_en is null or salida_en >= ingreso_en))
    or (estado = 'anulado' and anulado_en is not null and ingreso_en is null and salida_en is null)
  );

-- La bitácora solo registra las respuestas del personal.
alter table public.alerta_atenciones
  add constraint ck_atenciones_estado_valido
  check (estado in ('en_camino', 'atendida'));

-- Máximo 3 fotos por incidencia, impuesto por la base. El mínimo de 1 lo valida la app.
alter table public.incidencia_fotos
  add constraint ck_fotos_orden_1_a_3
  check (orden between 1 and 3);

-- ───────────── Índices del modelo ─────────────
create index idx_registros_sesion_usuario_fecha on public.registros_sesion (usuario_id, iniciado_en);
create index idx_dispositivos_usuario           on public.dispositivos (usuario_id);
create index idx_avisos_vigente_hasta           on public.avisos (vigente_hasta);
create index idx_pases_unidad_fecha             on public.pases_visita (unidad_id, fecha_visita);
create index idx_alertas_sector_creada          on public.alertas (sector_id, creada_en);
create index idx_incidencias_creada             on public.incidencias (creada_en);

-- ───────────── Índices para las políticas RLS y las llaves foráneas ─────────────
create index idx_perfiles_unidad               on public.perfiles (unidad_id);
create index idx_residentes_habilitados_unidad on public.residentes_habilitados (unidad_id);
create index idx_residentes_habilitados_creador on public.residentes_habilitados (creado_por);
create index idx_avisos_autor                  on public.avisos (autor_id);
create index idx_avisos_categoria              on public.avisos (categoria_id);
create index idx_aviso_sectores_sector         on public.aviso_sectores (sector_id);
create index idx_encuestas_autor               on public.encuestas (autor_id);
create index idx_encuestas_categoria           on public.encuestas (categoria_id);
create index idx_encuesta_sectores_sector      on public.encuesta_sectores (sector_id);
create index idx_votos_unidad                  on public.votos (unidad_id);
create index idx_votos_usuario                 on public.votos (usuario_id);
create index idx_voto_opciones_opcion_pregunta on public.voto_opciones (opcion_id, pregunta_id);
create index idx_pases_residente               on public.pases_visita (residente_id);
create index idx_pases_guardia                 on public.pases_visita (guardia_id);
create index idx_alertas_emisor                on public.alertas (emisor_id);
create index idx_alertas_unidad                on public.alertas (unidad_id);
create index idx_alertas_abiertas              on public.alertas (emisor_id) where estado <> 'atendida';
create index idx_atenciones_alerta             on public.alerta_atenciones (alerta_id);
create index idx_atenciones_usuario            on public.alerta_atenciones (usuario_id);
create index idx_incidencias_reportado_por     on public.incidencias (reportado_por);
create index idx_incidencias_unidad            on public.incidencias (unidad_id);
create index idx_incidencias_atendido_por      on public.incidencias (atendido_por);

commit;

-- =====================================================================
-- NeighborGood · REVERTIR LA MIGRACIÓN (solo desarrollo)
--
-- ⚠️  BORRA TODOS LOS DATOS de las 21 tablas y las
--     políticas, funciones y triggers de NeighborGood. No se puede deshacer.
--     (Los buckets de Storage no se borran: Supabase no lo permite con SQL.)
--     Nunca lo ejecutes en un proyecto con datos reales.
--
-- Úsalo cuando una parte de la migración falló a la mitad en el SQL Editor y
-- quieres empezar de cero: después vuelve a ejecutar las 6 partes en orden.
-- En local no hace falta: `supabase db reset` hace lo mismo y además aplica el seed.
-- =====================================================================
begin;

-- Storage: Supabase no permite borrar buckets ni objetos con SQL ("Direct deletion from storage
-- tables is not allowed"). Aquí solo se quitan las políticas; los buckets avisos e incidencias se
-- quedan (la parte 6 los crea con `on conflict do nothing`, así que volver a ejecutarla no falla).
-- Si quieres borrarlos, hazlo desde el panel (Storage) o con la API de Storage.
drop policy if exists "storage avisos: leen los usuarios activos"            on storage.objects;
drop policy if exists "storage avisos: la directiva sube"                    on storage.objects;
drop policy if exists "storage avisos: la directiva reemplaza"               on storage.objects;
drop policy if exists "storage avisos: la directiva borra"                   on storage.objects;
drop policy if exists "storage incidencias: leen el dueño y la directiva"    on storage.objects;
drop policy if exists "storage incidencias: el residente sube en su carpeta" on storage.objects;
drop policy if exists "storage incidencias: el residente borra de su carpeta" on storage.objects;

-- Trigger sobre auth.users (la tabla es de Supabase y se conserva).
drop trigger if exists trg_auth_users_crear_perfil on auth.users;

-- La tabla alertas sale de la publicación de Realtime al borrarse.
drop view if exists public.reporte_incidencias_mensual;

drop function if exists public.emitir_voto(uuid, jsonb);
drop function if exists public.resultados_encuesta(uuid);

drop table if exists
  public.incidencia_fotos, public.incidencias,
  public.alerta_atenciones, public.alertas,
  public.pases_visita,
  public.voto_opciones, public.votos,
  public.encuesta_opciones, public.encuesta_preguntas, public.encuesta_sectores, public.encuestas,
  public.aviso_sectores, public.avisos, public.categorias_aviso,
  public.dispositivos, public.contactos_emergencia, public.registros_sesion,
  public.residentes_habilitados, public.perfiles,
  public.unidades, public.sectores
cascade;

-- Esquema privado con todas sus funciones auxiliares y de triggers.
drop schema if exists privado cascade;

drop type if exists
  public.estado_incidencia, public.estado_alerta, public.tipo_alerta, public.estado_pase,
  public.tipo_seleccion, public.prioridad_encuesta, public.plataforma_dispositivo,
  public.tipo_sector, public.rol_usuario;

commit;

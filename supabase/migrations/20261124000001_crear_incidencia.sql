-- =====================================================================
-- NeighborGood · Parte 10: función crear_incidencia y permisos de inserción por columna (RF29)
--
-- Hace dos cosas:
--
-- 1. Cierra un hueco de permisos. La parte 5 daba `insert` sobre TODA la tabla incidencias, y la política
--    de inserción solo comprobaba el residente, el emisor y la unidad. Con una app modificada, un residente
--    podía insertar una incidencia ya `resuelto` o con un responsable (`atendido_por`) inventado. Ahora el
--    `insert` es por columnas, como en alertas: el residente solo puede enviar id, quién reporta, su unidad,
--    la ubicación y la descripción; el estado (`pendiente` por defecto), el responsable y las fechas los
--    fijan el DEFAULT de la tabla y el trigger de la parte 3.
--
-- 2. Guarda una incidencia completa (la incidencia y sus 1 a 3 fotos) en UNA sola transacción: si cualquier
--    paso falla no queda ninguna fila, así una incidencia nunca queda registrada sin sus fotos. Con
--    inserciones sueltas desde la app eso no se podría garantizar. El mínimo de 1 foto lo valida la app (RF29)
--    y también esta función; el máximo de 3 lo impone además el CHECK de la tabla (parte 2).
--
-- Es SECURITY INVOKER: se ejecuta con los permisos de quien la llama, así que las políticas RLS de la parte 5
-- siguen aplicando y no da ningún permiso extra.
--
-- Las fotos no se suben aquí: la app las sube antes al bucket privado `incidencias` (parte 6), en la ruta
-- `{usuario_id}/{incidencia_id}/{orden}.ext`, y esta función solo guarda esas rutas. Por eso la app genera el
-- id de la incidencia antes de subirlas y lo manda en `p_id`.
--
-- Se relaciona con: las tablas incidencias e incidencia_fotos (parte 1), el CHECK ck_fotos_orden_1_a_3
-- (parte 2), privado.es_residente y privado.unidad_actual (parte 3) y las políticas de la parte 5. La app la
-- llama desde src/repositorios/reportarIncidencia.ts (pantalla P7). Se prueba en
-- supabase/tests/database/12_crear_incidencia.test.sql.
-- =====================================================================
begin;

-- ───────────── Permisos de inserción por columna ─────────────
-- Se quita el permiso de toda la tabla y se concede solo sobre las columnas que el residente puede enviar.
-- El `select` y el `update (estado)` de la directiva (parte 5) no cambian.
revoke insert on public.incidencias       from authenticated;
revoke insert on public.incidencia_fotos  from authenticated;
grant insert (id, reportado_por, unidad_id, ubicacion, descripcion) on public.incidencias to authenticated;
grant insert (incidencia_id, foto_path, orden) on public.incidencia_fotos to authenticated;

-- ───────────── Función crear_incidencia ─────────────
-- Crea una incidencia con sus fotos y devuelve su id.
--   p_id: id de la incidencia, generado por la app antes de subir las fotos (es parte de su ruta).
--   p_ubicacion: dónde ocurre (la app la precarga con la unidad del residente y puede editarla).
--   p_descripcion: qué pasa.
--   p_fotos: rutas ya subidas al bucket `incidencias`, de 1 a 3; la posición en la lista es el `orden`.
-- Errores: 42501 si quien llama no es residente o no tiene unidad; 22023 si falta el id, la ubicación o la
-- descripción, si no hay de 1 a 3 fotos, si se repite una ruta o si una ruta no está en la carpeta
-- `{su id}/{p_id}/`; 23505 si ya existe una incidencia con ese id.
create or replace function public.crear_incidencia(
  p_id          uuid,
  p_ubicacion   text,
  p_descripcion text,
  p_fotos       text[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_unidad  uuid;
  v_fotos   integer := coalesce(cardinality(p_fotos), 0);
  v_prefijo text;
begin
  -- 1. Quién reporta: solo un residente con unidad (RLS también lo exige, pero así el error es claro).
  if not privado.es_residente() then
    raise exception 'Solo un residente puede reportar incidencias' using errcode = '42501';
  end if;
  v_unidad := privado.unidad_actual();
  if v_unidad is null then
    raise exception 'Tu perfil no tiene unidad' using errcode = '42501';
  end if;

  -- 2. Validar todo antes de insertar nada.
  if p_id is null then
    raise exception 'Falta el identificador de la incidencia' using errcode = '22023';
  end if;
  if p_ubicacion is null or btrim(p_ubicacion) = '' then
    raise exception 'La incidencia necesita una ubicación' using errcode = '22023';
  end if;
  if p_descripcion is null or btrim(p_descripcion) = '' then
    raise exception 'La incidencia necesita una descripción' using errcode = '22023';
  end if;
  if v_fotos < 1 or v_fotos > 3 then
    raise exception 'La incidencia necesita de 1 a 3 fotos' using errcode = '22023';
  end if;
  -- Cada foto debe estar en la carpeta del residente y de esta incidencia (así nadie adjunta archivos ajenos).
  v_prefijo := v_usuario::text || '/' || p_id::text || '/';
  if exists (
    select 1 from unnest(p_fotos) as f where f is null or left(f, length(v_prefijo)) <> v_prefijo
  ) then
    raise exception 'Las fotos deben estar en tu carpeta de esta incidencia' using errcode = '22023';
  end if;
  if (select count(distinct f) from unnest(p_fotos) as f) <> v_fotos then
    raise exception 'Una foto no puede repetirse' using errcode = '22023';
  end if;

  -- 3. Incidencia. reportado_por → perfiles.id y unidad_id → unidades.id (la política exige que sean los de
  -- quien llama). El estado queda `pendiente` por el DEFAULT de la tabla.
  insert into public.incidencias (id, reportado_por, unidad_id, ubicacion, descripcion)
  values (p_id, v_usuario, v_unidad, btrim(p_ubicacion), btrim(p_descripcion));

  -- 4. Fotos, en el orden recibido. incidencia_fotos.incidencia_id → incidencias.id (borrado en cascada).
  insert into public.incidencia_fotos (incidencia_id, foto_path, orden)
  select p_id, f.ruta, f.orden::smallint
    from unnest(p_fotos) with ordinality as f(ruta, orden);

  return p_id;
end;
$$;

-- Solo usuarios con sesión pueden llamarla (anon no); además RLS exige rol residente.
revoke execute on function public.crear_incidencia(uuid, text, text, text[]) from public, anon;
grant  execute on function public.crear_incidencia(uuid, text, text, text[]) to authenticated, service_role;

commit;

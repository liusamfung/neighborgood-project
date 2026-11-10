-- =====================================================================
-- NeighborGood · Parte 8: función crear_aviso (RF7, RF13)
--
-- Guarda un aviso completo (cabecera y sectores destino) en UNA sola transacción: si cualquier paso
-- falla, no queda ninguna fila, así que un aviso nunca queda publicado sin sus sectores (y llegaría a
-- todo el condominio por error). Con dos inserciones sueltas desde la app eso no se podría garantizar.
--
-- Es SECURITY INVOKER: se ejecuta con los permisos de quien la llama, así que las políticas RLS de
-- la parte 5 siguen aplicando (solo la directiva inserta en estas tablas). No da ningún permiso extra.
--
-- La imagen no se sube aquí: la app la sube antes al bucket privado `avisos` (parte 6) y esta función
-- solo guarda su ruta en `imagen_path`.
--
-- Se relaciona con: las tablas avisos y aviso_sectores (parte 1), el CHECK ck_avisos_vigencia_valida
-- (parte 2), privado.es_directiva (parte 3) y las políticas de la parte 5. La app la llama desde
-- src/repositorios/avisos.ts (pantalla P13). Se prueba en supabase/tests/database/07_crear_aviso.test.sql.
-- =====================================================================
begin;

-- Crea un aviso con sus sectores destino y devuelve su id.
--   p_sectores: sectores destino (RF13). Vacío o NULL = todo el condominio (para_todos = true).
--   p_imagen_path: ruta del archivo ya subido al bucket `avisos`; NULL o vacío = aviso sin imagen.
-- Errores: 42501 si quien llama no es directiva; 22023 si falta el título o la descripción;
-- 23514 si vigente_hasta no es posterior a vigente_desde (CHECK de la tabla); 23503 si la categoría o un
-- sector no existen (llave foránea).
create or replace function public.crear_aviso(
  p_titulo        text,
  p_descripcion   text,
  p_categoria_id  uuid,
  p_vigente_desde timestamptz,
  p_vigente_hasta timestamptz,
  p_sectores      uuid[],
  p_imagen_path   text default null
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_aviso uuid;
begin
  -- 1. Quién publica: solo la directiva (RLS también lo exige, pero así el error es claro).
  if not privado.es_directiva() then
    raise exception 'Solo la directiva puede publicar avisos' using errcode = '42501';
  end if;

  -- 2. Validar el contenido antes de insertar nada.
  if p_titulo is null or btrim(p_titulo) = '' then
    raise exception 'El aviso necesita un título' using errcode = '22023';
  end if;
  if p_descripcion is null or btrim(p_descripcion) = '' then
    raise exception 'El aviso necesita un mensaje' using errcode = '22023';
  end if;

  -- 3. Cabecera. autor_id → perfiles.id (la política exige que sea quien llama). El CHECK de la tabla
  -- rechaza vigente_hasta <= vigente_desde con el error 23514.
  insert into public.avisos (
    autor_id, categoria_id, para_todos, titulo, descripcion, imagen_path, vigente_desde, vigente_hasta
  ) values (
    (select auth.uid()), p_categoria_id, coalesce(cardinality(p_sectores), 0) = 0, btrim(p_titulo),
    btrim(p_descripcion), nullif(btrim(p_imagen_path), ''), p_vigente_desde, p_vigente_hasta
  )
  returning id into v_aviso;

  -- 4. Sectores destino (sin repetir). aviso_sectores.sector_id → sectores.id.
  if coalesce(cardinality(p_sectores), 0) > 0 then
    insert into public.aviso_sectores (aviso_id, sector_id)
    select v_aviso, s from unnest(p_sectores) as s group by s;
  end if;

  return v_aviso;
end;
$$;

-- Solo usuarios con sesión pueden llamarla (anon no); además RLS exige rol directiva.
revoke execute on function public.crear_aviso(text, text, uuid, timestamptz, timestamptz, uuid[], text) from public, anon;
grant  execute on function public.crear_aviso(text, text, uuid, timestamptz, timestamptz, uuid[], text) to authenticated, service_role;

commit;

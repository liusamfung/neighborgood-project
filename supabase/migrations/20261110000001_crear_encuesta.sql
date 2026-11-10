-- =====================================================================
-- NeighborGood · Parte 7: función crear_encuesta (RF8, RF13, RF14)
--
-- Guarda una encuesta completa (cabecera, sectores, preguntas y opciones) en UNA sola transacción:
-- si cualquier paso falla, no queda ninguna fila, así que los residentes nunca ven una encuesta a
-- medias. Con inserciones sueltas desde la app eso no se podría garantizar.
--
-- Es SECURITY INVOKER: se ejecuta con los permisos de quien la llama, así que las políticas RLS de
-- la parte 5 siguen aplicando (solo la directiva inserta en estas tablas). No da ningún permiso extra,
-- a diferencia de emitir_voto, que sí necesita SECURITY DEFINER porque el residente no puede insertar votos.
--
-- Se relaciona con: las tablas encuestas, encuesta_sectores, encuesta_preguntas y encuesta_opciones
-- (parte 1), el CHECK ck_encuestas_cierre_posterior (parte 2), privado.es_directiva (parte 3) y las
-- políticas de la parte 5. La app la llama desde src/repositorios/encuestas.ts (pantalla P14).
-- Se prueba en supabase/tests/database/06_crear_encuesta.test.sql.
-- =====================================================================
begin;

-- Crea una encuesta con sus sectores, preguntas y opciones y devuelve su id.
--   p_sectores: sectores destino (RF13). Vacío o NULL = todo el condominio (para_todos = true).
--   p_prioridad: 'alta' marca la encuesta como obligatoria (RF14).
--   p_preguntas: arreglo JSON en el orden en que se mostrarán:
--     [{ "texto": "...", "seleccion": "unica" | "multiple", "opciones": ["...", "..."] }]
--     El campo `orden` de preguntas y opciones se calcula con la posición en el arreglo.
-- Errores: 42501 si quien llama no es directiva; 22023 si falta el título, las preguntas o las opciones
-- (mínimo 2 por pregunta); 23514 si cierra_en no es posterior a abre_en (CHECK de la tabla).
create or replace function public.crear_encuesta(
  p_titulo             text,
  p_descripcion        text,
  p_categoria_id       uuid,
  p_prioridad          public.prioridad_encuesta,
  p_resultados_en_vivo boolean,
  p_abre_en            timestamptz,
  p_cierra_en          timestamptz,
  p_sectores           uuid[],
  p_preguntas          jsonb
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_encuesta  uuid;
  v_pregunta  record;
  v_pregunta_id uuid;
begin
  -- 1. Quién crea: solo la directiva (RLS también lo exige, pero así el error es claro).
  if not privado.es_directiva() then
    raise exception 'Solo la directiva puede crear encuestas' using errcode = '42501';
  end if;

  -- 2. Validar el contenido antes de insertar nada.
  if p_titulo is null or btrim(p_titulo) = '' then
    raise exception 'La encuesta necesita un título' using errcode = '22023';
  end if;
  if p_preguntas is null or jsonb_typeof(p_preguntas) <> 'array' or jsonb_array_length(p_preguntas) = 0 then
    raise exception 'La encuesta necesita al menos una pregunta' using errcode = '22023';
  end if;
  for v_pregunta in
    select e.value as pregunta from jsonb_array_elements(p_preguntas) as e(value)
  loop
    if coalesce(btrim(v_pregunta.pregunta ->> 'texto'), '') = '' then
      raise exception 'Cada pregunta necesita un texto' using errcode = '22023';
    end if;
    if coalesce(v_pregunta.pregunta ->> 'seleccion', 'unica') not in ('unica', 'multiple') then
      raise exception 'El tipo de selección debe ser unica o multiple' using errcode = '22023';
    end if;
    if jsonb_typeof(v_pregunta.pregunta -> 'opciones') is distinct from 'array'
       or (select count(*) from jsonb_array_elements_text(v_pregunta.pregunta -> 'opciones') o
            where btrim(o) <> '') < 2
       or exists (select 1 from jsonb_array_elements_text(v_pregunta.pregunta -> 'opciones') o
                   where btrim(o) = '') then
      raise exception 'Cada pregunta necesita al menos 2 opciones con texto' using errcode = '22023';
    end if;
  end loop;

  -- 3. Cabecera. autor_id → perfiles.id (la política exige que sea quien llama). El CHECK de la tabla
  -- rechaza cierra_en <= abre_en con el error 23514.
  insert into public.encuestas (
    autor_id, categoria_id, para_todos, titulo, descripcion, prioridad, resultados_en_vivo, abre_en, cierra_en
  ) values (
    (select auth.uid()), p_categoria_id, coalesce(cardinality(p_sectores), 0) = 0, btrim(p_titulo),
    nullif(btrim(p_descripcion), ''), coalesce(p_prioridad, 'normal'), coalesce(p_resultados_en_vivo, false),
    p_abre_en, p_cierra_en
  )
  returning id into v_encuesta;

  -- 4. Sectores destino (sin repetir). encuesta_sectores.sector_id → sectores.id.
  if coalesce(cardinality(p_sectores), 0) > 0 then
    insert into public.encuesta_sectores (encuesta_id, sector_id)
    select v_encuesta, s from unnest(p_sectores) as s group by s;
  end if;

  -- 5. Preguntas y opciones, con su orden según la posición en el arreglo (empieza en 1).
  for v_pregunta in
    select e.value as pregunta, e.ordinality::smallint as orden
      from jsonb_array_elements(p_preguntas) with ordinality as e(value, ordinality)
  loop
    insert into public.encuesta_preguntas (encuesta_id, texto, seleccion, orden)
    values (
      v_encuesta,
      btrim(v_pregunta.pregunta ->> 'texto'),
      coalesce(v_pregunta.pregunta ->> 'seleccion', 'unica')::public.tipo_seleccion,
      v_pregunta.orden
    )
    returning id into v_pregunta_id;

    insert into public.encuesta_opciones (pregunta_id, texto, orden)
    select v_pregunta_id, btrim(o.texto), o.orden::smallint
      from jsonb_array_elements_text(v_pregunta.pregunta -> 'opciones') with ordinality as o(texto, orden);
  end loop;

  return v_encuesta;
end;
$$;

-- Solo usuarios con sesión pueden llamarla (anon no); además RLS exige rol directiva.
revoke execute on function public.crear_encuesta(text, text, uuid, public.prioridad_encuesta, boolean, timestamptz, timestamptz, uuid[], jsonb) from public, anon;
grant  execute on function public.crear_encuesta(text, text, uuid, public.prioridad_encuesta, boolean, timestamptz, timestamptz, uuid[], jsonb) to authenticated, service_role;

commit;

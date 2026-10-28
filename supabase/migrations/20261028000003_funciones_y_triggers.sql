-- =====================================================================
-- NeighborGood · Parte 3 de 6: funciones SECURITY DEFINER, triggers y RPC
--
-- Las funciones auxiliares viven en el esquema `privado`, que la API de
-- Supabase no expone. Son SECURITY DEFINER con search_path vacío: leen las
-- tablas sin pasar por RLS, y por eso las políticas (parte 5) pueden usarlas
-- sin caer en recursión infinita ("infinite recursion detected in policy").
--
-- Dos funciones públicas (RPC) concentran las operaciones que no deben
-- hacerse con inserciones sueltas desde la app: emitir_voto y resultados_encuesta.
-- =====================================================================
begin;

create schema if not exists privado;

-- ───────────── Funciones auxiliares (consultan quién es el usuario actual) ─────────────
-- Devuelven NULL si no hay sesión, no hay perfil o el perfil está inactivo.
create or replace function privado.rol_actual()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = (select auth.uid()) and p.activo
$$;

create or replace function privado.unidad_actual()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.unidad_id from public.perfiles p where p.id = (select auth.uid()) and p.activo
$$;

create or replace function privado.sector_actual()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.sector_id
    from public.perfiles p
    join public.unidades u on u.id = p.unidad_id
   where p.id = (select auth.uid()) and p.activo
$$;

create or replace function privado.es_usuario_activo()
returns boolean language sql stable security definer set search_path = ''
as $$ select privado.rol_actual() is not null $$;

create or replace function privado.es_directiva()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(privado.rol_actual() = 'directiva', false) $$;

create or replace function privado.es_guardia()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(privado.rol_actual() = 'guardia', false) $$;

create or replace function privado.es_residente()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(privado.rol_actual() = 'residente', false) $$;

-- Personal = directiva o guardia (quienes atienden alertas).
create or replace function privado.es_personal()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(privado.rol_actual() in ('directiva', 'guardia'), false) $$;

-- Fecha de hoy en Lima: el pase vale solo el día de la visita, hasta las 23:59.
create or replace function privado.hoy_lima()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'America/Lima')::date $$;

-- ───────────── Funciones auxiliares por tema (evitan recursión entre políticas) ─────────────
create or replace function privado.aviso_en_mi_sector(p_aviso uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.aviso_sectores s
     where s.aviso_id = p_aviso and s.sector_id = privado.sector_actual()
  )
$$;

create or replace function privado.encuesta_en_mi_sector(p_encuesta uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.encuesta_sectores s
     where s.encuesta_id = p_encuesta and s.sector_id = privado.sector_actual()
  )
$$;

-- Un residente ve los avisos que ya empezaron (el historial incluye los vencidos)
-- y que son para todos o para su sector. La directiva ve todos.
create or replace function privado.puede_ver_aviso(p_aviso uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.avisos a
     where a.id = p_aviso
       and (
         privado.es_directiva()
         or (privado.es_residente()
             and a.vigente_desde <= now()
             and (a.para_todos or privado.aviso_en_mi_sector(a.id)))
       )
  )
$$;

-- Un residente ve las encuestas que ya abrieron (incluye las cerradas) y que son para todos o para su sector.
create or replace function privado.puede_ver_encuesta(p_encuesta uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.encuestas e
     where e.id = p_encuesta
       and (
         privado.es_directiva()
         or (privado.es_residente()
             and e.abre_en <= now()
             and (e.para_todos or privado.encuesta_en_mi_sector(e.id)))
       )
  )
$$;

create or replace function privado.puede_ver_pregunta(p_pregunta uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.encuesta_preguntas q
     where q.id = p_pregunta and privado.puede_ver_encuesta(q.encuesta_id)
  )
$$;

-- El personal ve los contactos de emergencia solo de quien tiene una alerta en curso.
create or replace function privado.puede_ver_contactos(p_usuario uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select privado.es_personal()
     and exists (
       select 1 from public.alertas a
        where a.emisor_id = p_usuario and a.estado in ('activa', 'en_camino')
     )
$$;

create or replace function privado.es_emisor_de(p_alerta uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.alertas a
     where a.id = p_alerta and a.emisor_id = (select auth.uid())
  )
$$;

-- Un voto es visible para la unidad que lo emitió y para la directiva.
create or replace function privado.puede_ver_voto(p_voto uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.votos v
     where v.id = p_voto
       and (privado.es_directiva() or v.unidad_id = privado.unidad_actual())
  )
$$;

create or replace function privado.es_dueno_de_incidencia(p_incidencia uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.incidencias i
     where i.id = p_incidencia and i.reportado_por = (select auth.uid())
  )
$$;

create or replace function privado.puede_ver_incidencia(p_incidencia uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select privado.es_directiva() or privado.es_dueno_de_incidencia(p_incidencia)
$$;

-- ───────────── Trigger: crear el perfil cuando el correo está habilitado ─────────────
-- Registro "suave": si el correo NO está en residentes_habilitados (o su unidad está
-- deshabilitada) no se crea ningún perfil. Sin perfil, las políticas RLS no dejan ver nada
-- y la app cierra la sesión con "Tu correo no está habilitado". El perfil se crea cuando el
-- correo está confirmado, para que nadie reclame un correo ajeno sin tener acceso a él.
-- La directiva y los guardias no pasan por aquí: sus perfiles se insertan a mano (ver README).
create or replace function privado.crear_perfil_al_registrarse()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_hab      public.residentes_habilitados%rowtype;
  v_nombre   text;
  v_apellido text;
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;
  if exists (select 1 from public.perfiles p where p.id = new.id) then
    return new;
  end if;

  select h.* into v_hab
    from public.residentes_habilitados h
    join public.unidades u on u.id = h.unidad_id and u.habilitada
   where h.correo = lower(btrim(new.email)) and not h.registrado
     for update of h;
  if not found then
    return new;
  end if;

  v_nombre   := split_part(btrim(v_hab.nombre), ' ', 1);
  v_apellido := btrim(substr(btrim(v_hab.nombre), length(v_nombre) + 1));

  insert into public.perfiles (id, unidad_id, nombre, apellido, rol)
  values (new.id, v_hab.unidad_id, v_nombre, v_apellido, 'residente');

  update public.residentes_habilitados set registrado = true where id = v_hab.id;
  return new;
end;
$$;

create trigger trg_auth_users_crear_perfil
  after insert or update of email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function privado.crear_perfil_al_registrarse();

-- ───────────── Trigger: la alerta nace activa y copia el sector de su unidad ─────────────
create or replace function privado.completar_alerta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  select u.sector_id into new.sector_id from public.unidades u where u.id = new.unidad_id;
  if new.sector_id is null then
    raise exception 'La unidad % no existe', new.unidad_id using errcode = '23503';
  end if;
  new.estado    := 'activa';
  new.creada_en := now();
  return new;
end;
$$;

create trigger trg_alertas_completar
  before insert on public.alertas
  for each row execute function privado.completar_alerta();

-- ───────────── Trigger: cada respuesta del personal actualiza el estado de la alerta ─────────────
-- Solo se permite activa → en_camino → atendida (un segundo "en camino" no cambia nada).
-- "atendida" es final.
create or replace function privado.registrar_atencion_de_alerta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_estado public.estado_alerta;
begin
  select a.estado into v_estado from public.alertas a where a.id = new.alerta_id for update;
  if v_estado is null or v_estado = 'atendida' then
    raise exception 'La alerta no admite más respuestas (estado: %)', coalesce(v_estado::text, 'inexistente')
      using errcode = '23514';
  end if;
  update public.alertas set estado = new.estado where id = new.alerta_id;
  return new;
end;
$$;

create trigger trg_atenciones_actualizar_alerta
  after insert on public.alerta_atenciones
  for each row execute function privado.registrar_atencion_de_alerta();

-- ───────────── Trigger: validar la selección de cada voto ─────────────
-- La llave compuesta ya garantiza que la opción pertenece a la pregunta. Aquí se valida que
-- la pregunta sea de la misma encuesta del voto y que la selección única admita una sola opción.
create or replace function privado.validar_voto_opcion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_encuesta_voto     uuid;
  v_encuesta_pregunta uuid;
  v_seleccion         public.tipo_seleccion;
begin
  select v.encuesta_id into v_encuesta_voto from public.votos v where v.id = new.voto_id;
  select q.encuesta_id, q.seleccion into v_encuesta_pregunta, v_seleccion
    from public.encuesta_preguntas q where q.id = new.pregunta_id;

  if v_encuesta_voto is distinct from v_encuesta_pregunta then
    raise exception 'La pregunta no pertenece a la encuesta de este voto' using errcode = '23514';
  end if;
  if v_seleccion = 'unica' and exists (
       select 1 from public.voto_opciones o
        where o.voto_id = new.voto_id and o.pregunta_id = new.pregunta_id
     ) then
    raise exception 'La pregunta es de selección única: solo se admite una opción' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_voto_opciones_validar
  before insert on public.voto_opciones
  for each row execute function privado.validar_voto_opcion();

-- ───────────── Trigger: solo la directiva cambia el rol, la unidad o el estado de un perfil ─────────────
-- Cada usuario puede editar su nombre, apellido y teléfono, pero RLS no distingue columnas.
-- Se aplica solo a quienes entran por la API (rol de base de datos `authenticated`): el SQL Editor y las
-- Edge Functions (service_role) no quedan limitados.
create or replace function privado.proteger_perfil()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not privado.es_directiva() then
    if new.id is distinct from old.id
       or new.rol is distinct from old.rol
       or new.activo is distinct from old.activo
       or new.unidad_id is distinct from old.unidad_id
       or new.creado_en is distinct from old.creado_en then
      raise exception 'Solo la directiva puede cambiar el rol, la unidad o el estado de un perfil'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_perfiles_proteger
  before update on public.perfiles
  for each row execute function privado.proteger_perfil();

-- ───────────── Trigger: fechas y responsable al cambiar el estado de una incidencia ─────────────
create or replace function privado.preparar_actualizacion_incidencia()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizada_en := now();
  if new.estado is distinct from old.estado then
    if current_user = 'authenticated' then
      new.atendido_por := (select auth.uid());
    end if;
    new.resuelta_en := case when new.estado = 'resuelto' then now() else null end;
  end if;
  return new;
end;
$$;

create trigger trg_incidencias_preparar
  before update on public.incidencias
  for each row execute function privado.preparar_actualizacion_incidencia();

-- ───────────── Trigger: "usado" y "anulado" son estados finales del pase ─────────────
create or replace function privado.proteger_pase()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.estado <> 'vigente' and new.estado is distinct from old.estado then
    raise exception 'Un pase % ya no puede cambiar de estado', old.estado using errcode = '23514';
  end if;
  if old.estado = 'vigente' and new.estado = 'anulado' then
    new.anulado_en := now();
  end if;
  return new;
end;
$$;

create trigger trg_pases_proteger
  before update on public.pases_visita
  for each row execute function privado.proteger_pase();

-- ───────────── RPC: emitir el voto de la unidad ─────────────
-- p_opciones: [{"pregunta_id": "...", "opcion_id": "..."}, ...] con al menos una opción por pregunta.
-- Inserta el voto y sus opciones en una sola transacción. Si la unidad ya votó, la llave única
-- (encuesta_id, unidad_id) rechaza el voto con el error 23505.
create or replace function public.emitir_voto(p_encuesta_id uuid, p_opciones jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_enc        public.encuestas%rowtype;
  v_unidad     uuid;
  v_voto       uuid;
  v_op         jsonb;
  v_preguntas  integer;
  v_respondidas integer;
begin
  if not privado.es_residente() then
    raise exception 'Solo un residente puede votar' using errcode = '42501';
  end if;
  v_unidad := privado.unidad_actual();
  if v_unidad is null then
    raise exception 'Tu perfil no tiene unidad' using errcode = '42501';
  end if;

  select * into v_enc from public.encuestas where id = p_encuesta_id;
  if not found then
    raise exception 'La encuesta no existe' using errcode = 'P0002';
  end if;
  if now() < v_enc.abre_en or now() >= v_enc.cierra_en then
    raise exception 'La encuesta no está abierta' using errcode = '22023';
  end if;
  if not (v_enc.para_todos or privado.encuesta_en_mi_sector(p_encuesta_id)) then
    raise exception 'La encuesta no está dirigida a tu sector' using errcode = '42501';
  end if;

  if p_opciones is null or jsonb_typeof(p_opciones) <> 'array' or jsonb_array_length(p_opciones) = 0 then
    raise exception 'Debes enviar al menos una opción' using errcode = '22023';
  end if;
  select count(*) into v_preguntas from public.encuesta_preguntas where encuesta_id = p_encuesta_id;
  select count(distinct o ->> 'pregunta_id') into v_respondidas from jsonb_array_elements(p_opciones) o;
  if v_respondidas <> v_preguntas then
    raise exception 'Debes responder todas las preguntas de la encuesta' using errcode = '22023';
  end if;

  insert into public.votos (encuesta_id, unidad_id, usuario_id)
  values (p_encuesta_id, v_unidad, (select auth.uid()))
  returning id into v_voto;

  for v_op in select * from jsonb_array_elements(p_opciones) loop
    insert into public.voto_opciones (voto_id, pregunta_id, opcion_id)
    values (v_voto, (v_op ->> 'pregunta_id')::uuid, (v_op ->> 'opcion_id')::uuid);
  end loop;

  return v_voto;
end;
$$;

-- ───────────── RPC: resultados de una encuesta (conteo por opción) ─────────────
-- Los residentes no pueden leer los votos de otras unidades: reciben solo el conteo, y solo si la
-- encuesta muestra resultados en vivo o ya cerró. La directiva los ve siempre.
create or replace function public.resultados_encuesta(p_encuesta_id uuid)
returns table (pregunta_id uuid, opcion_id uuid, total bigint)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_enc public.encuestas%rowtype;
begin
  select * into v_enc from public.encuestas where id = p_encuesta_id;
  if not found then
    raise exception 'La encuesta no existe' using errcode = 'P0002';
  end if;
  if not (
       privado.es_directiva()
       or (privado.puede_ver_encuesta(p_encuesta_id) and (v_enc.resultados_en_vivo or now() >= v_enc.cierra_en))
     ) then
    raise exception 'Los resultados de esta encuesta todavía no están disponibles' using errcode = '42501';
  end if;

  return query
    select o.pregunta_id, o.id, count(vo.voto_id)::bigint
      from public.encuesta_preguntas q
      join public.encuesta_opciones o on o.pregunta_id = q.id
      left join public.voto_opciones vo on vo.opcion_id = o.id and vo.pregunta_id = o.pregunta_id
     where q.encuesta_id = p_encuesta_id
     group by o.pregunta_id, o.id
     order by o.pregunta_id, o.id;
end;
$$;

-- ───────────── Permisos de ejecución ─────────────
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;

revoke execute on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated, service_role;

revoke execute on function public.emitir_voto(uuid, jsonb)   from public, anon;
revoke execute on function public.resultados_encuesta(uuid)  from public, anon;
grant  execute on function public.emitir_voto(uuid, jsonb)   to authenticated, service_role;
grant  execute on function public.resultados_encuesta(uuid)  to authenticated, service_role;

commit;

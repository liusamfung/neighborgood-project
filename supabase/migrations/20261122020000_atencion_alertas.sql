-- RF27: mantiene las respuestas monotónicas y serializadas; no amplía GRANT ni RLS.
-- La app inserta alerta_atenciones; el trigger existente usa esta función y actualiza alertas.
-- Pendiente de revisión/aplicación de Liu y pruebas SQL conjuntas.
begin;
-- La fila bloqueada impide dos transiciones simultáneas incompatibles y acciones duplicadas.
create or replace function privado.registrar_atencion_de_alerta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_estado public.estado_alerta;
begin
  select a.estado into v_estado from public.alertas a where a.id = new.alerta_id for update; -- FK → public.alertas.id
  if not ((v_estado = 'activa' and new.estado = 'en_camino')
       or (v_estado = 'en_camino' and new.estado = 'atendida')) then
    raise exception 'La alerta cambió o no admite esta respuesta. Actualiza su estado.' using errcode = '23514';
  end if;
  if v_estado is null then
    raise exception 'Alerta inexistente' using errcode = '23514';
  end if;
  update public.alertas set estado = new.estado where id = new.alerta_id;
  return new;
end;
$$;
revoke all on function privado.registrar_atencion_de_alerta() from public, anon, authenticated;
commit;

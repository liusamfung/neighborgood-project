-- RF12: señal Realtime de resultados sin publicar votos ni identidades de las unidades.
-- La app escucha UPDATE de encuestas y vuelve a pedir el agregado a resultados_encuesta.
-- RLS de encuestas conserva sector/rol; la RPC conserva el permiso de ver los conteos.
-- Aplicación remota pendiente de Liu. No modifica tipos ni columnas del modelo.
begin;

-- Una escritura sin cambio de valor emite una señal después del COMMIT del voto completo.
-- Si la RPC revierte por respuestas inválidas, esta actualización también se revierte.
create or replace function privado.notificar_cambio_resultados()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_encuesta uuid;
begin
  v_encuesta := coalesce(new.encuesta_id, old.encuesta_id); -- FK → public.encuestas.id
  update public.encuestas e set resultados_en_vivo = e.resultados_en_vivo
   where e.id = v_encuesta and e.resultados_en_vivo;
  -- No se emiten señales por voto cuando los resultados están reservados al cierre.
  return null;
end;
$$;
revoke all on function privado.notificar_cambio_resultados() from public, anon, authenticated;

drop trigger if exists trg_votos_senal_resultados on public.votos;
create trigger trg_votos_senal_resultados after insert or delete on public.votos
  for each row execute function privado.notificar_cambio_resultados();

-- Publica solo metadatos de encuestas, que ya están protegidos por su política de lectura.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime'
     and schemaname = 'public' and tablename = 'encuestas'
  ) then
    alter publication supabase_realtime add table public.encuestas;
  end if;
end;
$$;
commit;

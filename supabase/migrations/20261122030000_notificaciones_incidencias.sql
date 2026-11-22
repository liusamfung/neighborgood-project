-- RF30: cola privada transaccional para cambios de estado; la Edge Function procesa sus INSERT.
-- Relación: incidencias → incidencia_notificaciones → webhook → notificar-incidencia → Expo Push.
-- Liu debe revisar/aplicar y configurar el webhook; no contiene URL, tokens ni secretos.
begin;
create table public.incidencia_notificaciones (
  id uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references public.incidencias(id) on delete cascade, -- FK → public.incidencias.id (borrado en cascada)
  reportado_por uuid not null references public.perfiles(id) on delete cascade, -- FK → public.perfiles.id (borrado en cascada)
  estado public.estado_incidencia not null,
  cambio_en timestamptz not null,
  estado_envio text not null default 'pendiente' check (estado_envio in ('pendiente','enviando','aceptado','parcial','sin_destino','fallido','incierto')),
  intentado_en timestamptz,
  resultados jsonb not null default '[]'::jsonb,
  error_codigo text,
  unique (incidencia_id, cambio_en, estado)
);
alter table public.incidencia_notificaciones enable row level security;
-- No hay políticas ni permisos de cliente: ni el residente ni la directiva envían push arbitrarias.
revoke all on public.incidencia_notificaciones from public, anon, authenticated;
grant select, update on public.incidencia_notificaciones to service_role;

-- Inserta el evento con el reportante persistido, dentro de la misma transacción del cambio.
create or replace function privado.encolar_cambio_incidencia()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado is distinct from old.estado and new.estado in ('en_atencion','resuelto') then
    insert into public.incidencia_notificaciones (incidencia_id, reportado_por, estado, cambio_en)
    values (new.id, new.reportado_por, new.estado, new.actualizada_en)
    on conflict (incidencia_id, cambio_en, estado) do nothing;
  end if;
  return null;
end;
$$;
revoke all on function privado.encolar_cambio_incidencia() from public, anon, authenticated;
create trigger trg_incidencias_notificacion after update on public.incidencias
  for each row execute function privado.encolar_cambio_incidencia();

-- Cambios abiertos bajo la misma RLS que la lectura, sin dar acceso a reportes ajenos.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'incidencias'
  ) then alter publication supabase_realtime add table public.incidencias; end if;
end; $$;
commit;

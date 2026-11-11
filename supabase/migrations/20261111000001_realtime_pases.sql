-- NeighborGood · Migración 9: pases_visita en Realtime (RF21)
--
-- Qué hace: agrega la tabla `pases_visita` a la publicación `supabase_realtime`, igual que ya se hizo
-- con `alertas` en la parte 5.
-- Para qué: cuando el guardia valida el ingreso (Edge Function `validar-pase`), el pase cambia a
-- `usado`. Con Realtime, la app abierta del residente recibe ese cambio al instante y muestra "Tu
-- visita ingresó" (RF21). Con la app cerrada el aviso llega por push (la misma función lo envía).
-- Seguridad: Realtime respeta las políticas RLS de la tabla, así que cada residente recibe solo los
-- cambios de sus propios pases ("pases_visita: lectura", parte 5).
-- Relaciones: depende de la tabla `pases_visita` (parte 1) y de sus políticas (parte 5). La usa
-- `src/repositorios/pases.ts` (`escucharMisPases`).
-- Se puede ejecutar más de una vez: solo agrega la tabla si todavía no está en la publicación.

begin;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pases_visita'
     ) then
    alter publication supabase_realtime add table public.pases_visita;
  end if;
end;
$$;

commit;

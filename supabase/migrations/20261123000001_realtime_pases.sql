-- NeighborGood · pases_visita en Realtime (RF21)
--
-- Qué hace: agrega la tabla `pases_visita` a la publicación `supabase_realtime`, igual que la parte 5 ya
-- lo hizo con `alertas`.
-- Para qué: cuando el guardia valida el ingreso (Edge Function `validar-pase`), el pase cambia a `usado`.
-- Con Realtime, la app abierta del residente recibe ese cambio al instante, muestra "Tu visita ingresó" y
-- actualiza "Mis pases" (RF21). Con la app cerrada el aviso llega por push (lo manda la misma función).
-- Seguridad: Realtime respeta las políticas RLS de la tabla, así que cada residente recibe solo los cambios
-- de sus propios pases ("pases_visita: lectura", parte 5).
-- Relaciones: depende de la tabla `pases_visita` (parte 1) y de sus políticas (parte 5). La usa
-- `src/repositorios/avisoDeIngreso.ts` (`escucharIngresos`).
-- Se puede ejecutar más de una vez: solo agrega la tabla si todavía no está en la publicación.

begin;

-- Bloque anónimo: `alter publication ... add table` falla si la tabla ya está, por eso se revisa antes.
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

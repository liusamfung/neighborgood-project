-- =====================================================================
-- NeighborGood · Parte 12: rendimiento de las políticas de lectura (RNF5, escalabilidad)
--
-- Qué arregla: la prueba de carga del RNF5 (500 unidades, 50 000 pases, 10 000 alertas e incidencias; ver
--   `supabase/carga/` y `docs/pruebas/RNF.md`) mostró que las políticas de lectura llamaban a las funciones
--   `privado.es_directiva()`, `es_guardia()`, `es_personal()`, `es_residente()`, `hoy_lima()` y
--   `sector_actual()` UNA VEZ POR FILA. Son funciones `security definer` y Postgres no puede incluirlas
--   dentro de la consulta, así que cada llamada repetía una lectura de `perfiles`. Resultado con ese
--   volumen: "visitas de hoy" del guardia tardaba 2,1 s y "mis pases" del residente 2,0 s.
-- Cómo lo arregla: se escribe `(select privado.es_directiva())` en vez de `privado.es_directiva()`. Postgres
--   evalúa una subconsulta que no depende de la fila una sola vez por consulta (un "InitPlan") y reutiliza el
--   resultado. El significado de cada política NO cambia: las funciones dependen solo de la sesión, nunca de
--   la fila. Las que sí miran la fila (`es_emisor_de(alerta_id)`) se dejan como estaban. Las políticas de
--   `insert` también se quedan igual: se evalúan una vez por fila escrita, no por fila leída.
--   No se agrega ningún índice: se probó uno por `fecha_visita` y Postgres no lo usa (la política es un `or`),
--   y con 50 000 pases recorrer la tabla entera ya tarda unos 3 ms.
--
-- Se relaciona con: las políticas de la parte 5 (`20261028000005_rls_y_permisos.sql`), las funciones
-- privado.* de la parte 3 y los repositorios `src/repositorios/{pases,alertas,validacionPases,incidencias}.ts`.
-- El comportamiento no cambia: lo comprueban `supabase/tests/database/04_politicas_por_rol.test.sql` y
-- `14_rls_rendimiento.test.sql`.
-- =====================================================================

begin;

-- ── pases_visita ──
-- El residente ve los suyos; el guardia ve los de hoy (hora de Lima); la directiva ve todos.
drop policy if exists "pases_visita: lectura" on public.pases_visita;
create policy "pases_visita: lectura" on public.pases_visita
  for select to authenticated
  using (
    residente_id = (select auth.uid())
    or (select privado.es_directiva())
    or ((select privado.es_guardia()) and fecha_visita = (select privado.hoy_lima()))
  );

-- ── alertas ──
-- Las ve quien la emitió, los vecinos de su sector (RF25) y todo el personal.
drop policy if exists "alertas: lectura" on public.alertas;
create policy "alertas: lectura" on public.alertas
  for select to authenticated
  using (
    emisor_id = (select auth.uid())
    or (select privado.es_personal())
    or ((select privado.es_residente()) and sector_id = (select privado.sector_actual()))
  );

-- ── alerta_atenciones ──
-- Bitácora de respuestas: la ve el personal y quien emitió la alerta (`es_emisor_de` mira la fila).
drop policy if exists "alerta_atenciones: lectura" on public.alerta_atenciones;
create policy "alerta_atenciones: lectura" on public.alerta_atenciones
  for select to authenticated
  using ((select privado.es_personal()) or privado.es_emisor_de(alerta_id));

-- ── incidencias ──
-- El residente ve las que reportó; la directiva ve todas. La vista del reporte mensual (RF31) la hereda
-- porque es `security_invoker`.
drop policy if exists "incidencias: lectura" on public.incidencias;
create policy "incidencias: lectura" on public.incidencias
  for select to authenticated
  using (reportado_por = (select auth.uid()) or (select privado.es_directiva()));

commit;

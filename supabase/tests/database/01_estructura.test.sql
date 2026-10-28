-- Pruebas de estructura: tablas, RLS, permisos y objetos auxiliares.
-- Se ejecutan con `supabase test db` y no dejan rastro (todo se revierte al final).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ───────────── Tablas, tipos y objetos ─────────────
select is((select count(*)::int from pg_tables where schemaname = 'public'), 21,
  'El esquema public tiene las 21 tablas del modelo');

select is((select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
            where n.nspname = 'public' and t.typtype = 'e'), 9,
  'Existen los 9 tipos enumerados');

select has_view('public', 'reporte_incidencias_mensual', 'Existe la vista del reporte mensual');
select has_function('privado', 'rol_actual', 'Existe la función auxiliar privado.rol_actual');
select has_function('public', 'emitir_voto', array['uuid', 'jsonb'], 'Existe la función emitir_voto');
select has_function('public', 'resultados_encuesta', array['uuid'], 'Existe la función resultados_encuesta');

select is((select count(*)::int from storage.buckets where id in ('avisos', 'incidencias') and not public), 2,
  'Los buckets avisos e incidencias existen y son privados');

select ok(exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alertas'),
  'La tabla alertas está en la publicación de Realtime');

-- ───────────── RLS (RNF6) ─────────────
select is_empty($$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'RLS está activada en todas las tablas de public');

select ok((select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'RLS está activada en storage.objects');

select is_empty($$
  select t.tablename from pg_tables t
   where t.schemaname = 'public'
     and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)
$$, 'Toda tabla de public tiene al menos una política');

-- ───────────── Permisos ─────────────
select is((select count(*)::int from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
              and has_any_column_privilege('anon', c.oid, 'select,insert,update,references')),
  0, 'anon no tiene ningún permiso sobre las tablas');

select ok(not has_any_column_privilege('anon', 'public.reporte_incidencias_mensual', 'select'),
  'anon no puede leer la vista del reporte');

select ok(not has_function_privilege('anon', 'public.emitir_voto(uuid,jsonb)', 'execute'),
  'anon no puede ejecutar emitir_voto');
select ok(not has_function_privilege('anon', 'privado.rol_actual()', 'execute'),
  'anon no puede ejecutar las funciones del esquema privado');

select is((select count(*)::int from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
              and not has_table_privilege('service_role', c.oid, 'select,insert,update,delete')),
  0, 'service_role tiene permisos sobre las 21 tablas (las Edge Functions los necesitan)');

select ok(not has_table_privilege('authenticated', 'public.perfiles', 'delete'),
  'Nadie borra perfiles desde la API (la baja es activo = false)');
select ok(not has_table_privilege('authenticated', 'public.votos', 'insert'),
  'Los votos no se insertan directamente: se usa emitir_voto');
select ok(not has_table_privilege('authenticated', 'public.pases_visita', 'insert'),
  'Los pases los crea la Edge Function, no la app');
select ok(not has_column_privilege('authenticated', 'public.alertas', 'estado', 'insert'),
  'La app no puede fijar el estado de una alerta al crearla');
select ok(not has_table_privilege('authenticated', 'public.alertas', 'update'),
  'La app no actualiza alertas directamente (se usa la bitácora de atenciones)');

select * from finish();
rollback;

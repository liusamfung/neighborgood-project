-- =====================================================================
-- NeighborGood · verificación de la migración (SOLO LECTURA)
--
-- Pégalo en el SQL Editor del proyecto real después de ejecutar las 6 partes.
-- No modifica nada. Cada fila dice OK o REVISAR; si alguna sale REVISAR,
-- no sigas: avisa antes de usar la base.
--
-- Se relaciona con: las partes 1 a 6 de supabase/migrations (comprueba que se aplicaron) y el
--   README, sección Base de datos. Los controles se agrupan así: 1 a 5 estructura y políticas, 6 a 9
--   tipos, Storage y Realtime, 10 a 12 trigger, funciones y vista, 13 a 15 permisos y 16 datos de
--   prueba.
-- =====================================================================
select control, resultado, estado from (
  -- Estructura: 21 tablas propias, todas con RLS y al menos una política (partes 1 y 5).
  select 1 as n, 'Tablas en public (esperado 21)' as control, count(*)::text as resultado,
         case when count(*) = 21 then 'OK' else 'REVISAR' end as estado
    from pg_tables where schemaname = 'public'
  union all
  select 2, 'Tablas sin RLS (esperado 0)', count(*)::text,
         case when count(*) = 0 then 'OK' else 'REVISAR' end
    from pg_tables where schemaname = 'public' and not rowsecurity
  union all
  select 3, 'Tablas sin ninguna política (esperado 0)', count(*)::text,
         case when count(*) = 0 then 'OK' else 'REVISAR' end
    from pg_tables t
   where t.schemaname = 'public'
     and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)
  -- Cantidad de políticas: 45 en las tablas (parte 5) y 7 en Storage (parte 6).
  union all
  select 4, 'Políticas en public (esperado 45)', count(*)::text,
         case when count(*) = 45 then 'OK' else 'REVISAR' end
    from pg_policies where schemaname = 'public'
  union all
  select 5, 'Políticas de Storage de NeighborGood (esperado 7)', count(*)::text,
         case when count(*) = 7 then 'OK' else 'REVISAR' end
    from pg_policies where schemaname = 'storage' and policyname like 'storage %'
  -- Tipos enumerados (parte 1), buckets privados y RLS sobre storage.objects (parte 6).
  union all
  select 6, 'Tipos enumerados (esperado 9)', count(*)::text,
         case when count(*) = 9 then 'OK' else 'REVISAR' end
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' and t.typtype = 'e'
  union all
  select 7, 'Buckets privados avisos e incidencias (esperado 2)', count(*)::text,
         case when count(*) = 2 then 'OK' else 'REVISAR' end
    from storage.buckets where id in ('avisos', 'incidencias') and not public
  union all
  select 8, 'RLS activa en storage.objects', relrowsecurity::text,
         case when relrowsecurity then 'OK' else 'REVISAR' end
    from pg_class where oid = 'storage.objects'::regclass
  -- Realtime solo publica la tabla alertas (parte 5).
  union all
  select 9, 'Tabla alertas en la publicación de Realtime', count(*)::text,
         case when count(*) = 1 then 'OK' else 'REVISAR' end
    from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alertas'
  -- Trigger de registro, funciones auxiliares y vista del reporte (partes 3 y 4).
  union all
  select 10, 'Trigger de registro sobre auth.users (esperado 1)', count(*)::text,
         case when count(*) = 1 then 'OK' else 'REVISAR' end
    from pg_trigger where tgname = 'trg_auth_users_crear_perfil' and not tgisinternal
  union all
  select 11, 'Funciones auxiliares del esquema privado (esperado más de 20)', count(*)::text,
         case when count(*) > 20 then 'OK' else 'REVISAR' end
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'privado'
  union all
  select 12, 'Vista reporte_incidencias_mensual (esperado 1)', count(*)::text,
         case when count(*) = 1 then 'OK' else 'REVISAR' end
    from pg_views where schemaname = 'public' and viewname = 'reporte_incidencias_mensual'
  -- Permisos: anon no recibe nada; service_role sí necesita sus GRANT; anon no ejecuta emitir_voto.
  union all
  select 13, 'Tablas donde anon tiene algún permiso (esperado 0)', count(*)::text,
         case when count(*) = 0 then 'OK' else 'REVISAR' end
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')
     and has_any_column_privilege('anon', c.oid, 'select,insert,update,references')
  union all
  select 14, 'Tablas donde service_role NO puede leer ni escribir (esperado 0)', count(*)::text,
         case when count(*) = 0 then 'OK' else 'REVISAR' end
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and not has_table_privilege('service_role', c.oid, 'select,insert,update,delete')
  union all
  select 15, 'anon puede ejecutar emitir_voto (esperado false)',
         has_function_privilege('anon', 'public.emitir_voto(uuid,jsonb)', 'execute')::text,
         case when not has_function_privilege('anon', 'public.emitir_voto(uuid,jsonb)', 'execute') then 'OK' else 'REVISAR' end
  -- El seed.sql (usuarios @neighborgood.test) nunca debe haberse cargado en el proyecto real.
  union all
  select 16, 'Datos de prueba cargados por error (esperado 0 usuarios @neighborgood.test)', count(*)::text,
         case when count(*) = 0 then 'OK' else 'REVISAR' end
    from auth.users where email like '%@neighborgood.test'
) c order by n;

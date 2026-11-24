-- =====================================================================
-- NeighborGood · RNF5 (escalabilidad) · medición de las consultas de la app con los datos de carga
--
-- Qué hace: repite cada consulta que usan las pantallas de la app y mide cuántos milisegundos tarda, como
--   lo haría cada rol (residente, guardia, directiva). Al final imprime una tabla con el promedio, la
--   mediana, el percentil 95 y el máximo por consulta con un veredicto, y los planes de ejecución de las
--   consultas más pesadas (para ver si usan los índices).
-- Cómo funciona: la función `medir` se pone el rol `authenticated` y el JWT del usuario, igual que
--   PostgREST, así que las políticas RLS cuentan en el tiempo (en una consulta real son parte del costo).
--   La primera repetición de cada consulta es de calentamiento y no se anota. Las consultas son las de los
--   repositorios de `src/repositorios`, escritas en SQL: PostgREST arma una consulta equivalente. En el
--   texto de cada consulta, `%uid%`, `%unidad%` y `%pase%` se cambian por el usuario, su unidad y un pase de
--   hoy. Las escrituras se miden dentro de una subtransacción que se deshace, para no ensuciar la base.
-- Se relaciona con: `generar_datos.sql` (debe haberse ejecutado antes), `concurrencia.pgbench` (la misma
--   carga con muchos usuarios a la vez) y `docs/pruebas/RNF.md` (donde se anotan los resultados). Se
--   ejecuta con `npm run carga:medir`.
-- =====================================================================
\set ON_ERROR_STOP on
\pset footer off

-- Usuarios de la prueba: la directiva y el guardia del seed, y el primer residente de carga (con su
-- unidad). `\gset` guarda cada columna en una variable de psql.
select '90000000-0000-0000-0000-000000000001' as dir_id \gset
select '90000000-0000-0000-0000-000000000002' as gua_id \gset
select p.id as res_id, p.unidad_id as res_unidad
from public.perfiles p where p.apellido = 'Carga' order by p.nombre limit 1 \gset
-- Un pase de hoy: el que el guardia validaría al escanear su QR.
select id as pase_hoy from public.pases_visita
where fecha_visita = (now() at time zone 'America/Lima')::date limit 1 \gset
-- Los valores de arriba se guardan como ajustes de la sesión para que la función los lea.
select set_config('carga.unidad', :'res_unidad', false) as ajuste_unidad,
       set_config('carga.pase', :'pase_hoy', false) as ajuste_pase \gset

create temp table resultados (
  orden int, rol text, consulta text, filas bigint, veces int,
  promedio_ms numeric, mediana_ms numeric, p95_ms numeric, maximo_ms numeric
);
create temp sequence orden_seq;
-- El rol `authenticated` debe poder anotar sus tiempos en la tabla de resultados.
grant all on resultados to public;

-- Mide una consulta de lectura. p_rol: texto para el informe; p_nombre: qué pantalla es; p_uid: usuario
-- cuyo JWT se simula; p_sql: la consulta tal como la manda la app (con su order by y limit); p_veces:
-- repeticiones medidas.
create or replace function pg_temp.medir(p_rol text, p_nombre text, p_uid uuid, p_sql text, p_veces int default 50)
returns void language plpgsql as $$
declare
  i int; t0 timestamptz; v_filas bigint; v_t numeric[] := '{}';
  v_sql text := replace(replace(replace(p_sql, '%uid%', p_uid::text),
                                 '%unidad%', current_setting('carga.unidad')),
                        '%pase%', current_setting('carga.pase'));
begin
  for i in 0..p_veces loop
    -- Igual que PostgREST: el rol `authenticated` y el JWT con el id del usuario.
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', p_uid::text, true);
    set local role authenticated;
    t0 := clock_timestamp();
    execute format('select count(*) from (%s) q', v_sql) into v_filas;
    if i > 0 then v_t := v_t || (extract(epoch from clock_timestamp() - t0) * 1000)::numeric; end if;
    reset role;
  end loop;
  insert into resultados
  select nextval('orden_seq'), p_rol, p_nombre, v_filas, p_veces,
         round((select avg(x) from unnest(v_t) x), 2),
         round((select percentile_cont(0.5)  within group (order by x) from unnest(v_t) x)::numeric, 2),
         round((select percentile_cont(0.95) within group (order by x) from unnest(v_t) x)::numeric, 2),
         round((select max(x) from unnest(v_t) x), 2);
end $$;

-- Mide una escritura (INSERT) con sus triggers y políticas, y la deshace con una excepción capturada
-- (el bloque begin/exception es una subtransacción: el INSERT no queda).
create or replace function pg_temp.medir_escritura(p_rol text, p_nombre text, p_uid uuid, p_sql text, p_veces int default 50)
returns void language plpgsql as $$
declare
  i int; t0 timestamptz; v_t numeric[] := '{}';
  v_sql text := replace(replace(p_sql, '%uid%', p_uid::text), '%unidad%', current_setting('carga.unidad'));
begin
  for i in 0..p_veces loop
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', p_uid::text, true);
      set local role authenticated;
      t0 := clock_timestamp();
      execute v_sql;
      if i > 0 then v_t := v_t || (extract(epoch from clock_timestamp() - t0) * 1000)::numeric; end if;
      raise exception 'deshacer';
    exception when raise_exception then
      null;
    end;
    reset role;
  end loop;
  insert into resultados
  select nextval('orden_seq'), p_rol, p_nombre, 1, p_veces,
         round((select avg(x) from unnest(v_t) x), 2),
         round((select percentile_cont(0.5)  within group (order by x) from unnest(v_t) x)::numeric, 2),
         round((select percentile_cont(0.95) within group (order by x) from unnest(v_t) x)::numeric, 2),
         round((select max(x) from unnest(v_t) x), 2);
end $$;

-- ───────────── Residente ─────────────
select pg_temp.medir('residente', 'Avisos vigentes (lista completa)', :'res_id', $q$
  select a.id, a.titulo, a.descripcion, a.imagen_path, a.vigente_desde, a.vigente_hasta, a.creado_en, c.id, c.nombre
  from public.avisos a join public.categorias_aviso c on c.id = a.categoria_id
  order by a.vigente_desde desc $q$);
select pg_temp.medir('residente', 'Mis alertas (página de 20)', :'res_id', $q$
  select a.id, a.tipo, a.estado, a.creada_en, u.codigo, s.nombre
  from public.alertas a join public.unidades u on u.id = a.unidad_id join public.sectores s on s.id = a.sector_id
  where a.emisor_id = '%uid%'
  order by a.creada_en desc, a.id limit 20 $q$);
select pg_temp.medir('residente', 'Alertas de mi sector (página de 20)', :'res_id', $q$
  select a.id, a.tipo, a.estado, a.creada_en, u.codigo, s.nombre
  from public.alertas a join public.unidades u on u.id = a.unidad_id join public.sectores s on s.id = a.sector_id
  order by a.creada_en desc, a.id limit 20 $q$);
select pg_temp.medir('residente', 'Mis pases de visita (últimos 30)', :'res_id', $q$
  select p.id, p.nombre_visitante, p.fecha_visita, p.hora_estimada, p.estado, p.creado_en
  from public.pases_visita p
  order by p.fecha_visita desc, p.creado_en desc limit 30 $q$);
select pg_temp.medir('residente', 'Mis incidencias (página de 20)', :'res_id', $q$
  select i.id, i.ubicacion, i.descripcion, i.estado, i.creada_en, u.codigo
  from public.incidencias i join public.unidades u on u.id = i.unidad_id
  order by i.creada_en desc, i.id limit 20 $q$);

-- ───────────── Guardia ─────────────
select pg_temp.medir('guardia', 'Visitas de hoy (RF20)', :'gua_id', $q$
  select p.id, p.nombre_visitante, p.hora_estimada, p.estado, p.ingreso_en, p.salida_en, u.codigo, s.nombre
  from public.pases_visita p join public.unidades u on u.id = p.unidad_id join public.sectores s on s.id = u.sector_id
  where p.estado <> 'anulado'
  order by p.ingreso_en desc nulls first, p.hora_estimada $q$);
select pg_temp.medir('guardia', 'Alertas (página de 20)', :'gua_id', $q$
  select a.id, a.tipo, a.estado, a.creada_en, u.codigo, s.nombre
  from public.alertas a join public.unidades u on u.id = a.unidad_id join public.sectores s on s.id = a.sector_id
  order by a.creada_en desc, a.id limit 20 $q$);
select pg_temp.medir('guardia', 'Buscar un pase por su QR', :'gua_id', $q$
  select p.id, p.nombre_visitante, p.estado, p.fecha_visita, p.unidad_id
  from public.pases_visita p where p.id = '%pase%' $q$);

-- ───────────── Directiva ─────────────
select pg_temp.medir('directiva', 'Reporte mensual de incidencias (12 meses, RF31)', :'dir_id', $q$
  select mes, total, pendientes, en_atencion, resueltas
  from public.reporte_incidencias_mensual
  where mes >= date_trunc('month', now() at time zone 'America/Lima')::date - interval '11 months'
  order by mes $q$);
select pg_temp.medir('directiva', 'Historial de alertas con respuestas (página de 20)', :'dir_id', $q$
  select a.id, a.tipo, a.estado, a.creada_en, u.codigo, s.nombre,
         (select jsonb_agg(jsonb_build_object('estado', t.estado, 'creado_en', t.creado_en))
          from public.alerta_atenciones t where t.alerta_id = a.id) as atenciones
  from public.alertas a join public.unidades u on u.id = a.unidad_id join public.sectores s on s.id = a.sector_id
  order by a.creada_en desc, a.id limit 20 $q$);
select pg_temp.medir('directiva', 'Incidencias pendientes (página de 20)', :'dir_id', $q$
  select i.id, i.ubicacion, i.descripcion, i.estado, i.creada_en, u.codigo
  from public.incidencias i join public.unidades u on u.id = i.unidad_id
  where i.estado = 'pendiente'
  order by i.creada_en desc, i.id limit 20 $q$);
select pg_temp.medir('directiva', 'Avisos (lista completa)', :'dir_id', $q$
  select a.id, a.titulo, a.descripcion, a.imagen_path, a.vigente_desde, a.vigente_hasta, a.creado_en, c.id, c.nombre
  from public.avisos a join public.categorias_aviso c on c.id = a.categoria_id
  order by a.vigente_desde desc $q$);

-- ───────────── Escrituras (se deshacen) ─────────────
select pg_temp.medir_escritura('residente', 'Emitir una alerta (INSERT)', :'res_id', $q$
  insert into public.alertas (emisor_id, unidad_id, tipo) values ('%uid%', '%unidad%', 'medica') $q$);

-- ───────────── Resultado ─────────────
\echo
\echo '== Tiempos por consulta (ms), con 50 repeticiones cada una =='
select rol, consulta, filas, promedio_ms as prom, mediana_ms as mediana, p95_ms as p95, maximo_ms as max,
       case when p95_ms < 1000 then 'OK' when p95_ms < 3000 then 'LENTA (<3 s)' else 'FALLA (>=3 s)' end as veredicto
from resultados order by orden;

\echo
\echo '== Tamaño de las tablas =='
select c.relname as tabla, c.reltuples::bigint as filas, pg_size_pretty(pg_total_relation_size(c.oid)) as tamano
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('pases_visita', 'alertas', 'alerta_atenciones', 'incidencias', 'avisos', 'perfiles', 'unidades')
order by pg_total_relation_size(c.oid) desc;

-- ───────────── Planes de ejecución de las consultas más pesadas ─────────────
\echo
\echo '== Plan: guardia, visitas de hoy =='
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'gua_id'::text, 'role', 'authenticated')::text, true);
set local role authenticated;
explain (analyze, buffers, costs off, timing off) select p.id from public.pases_visita p where p.estado <> 'anulado';
rollback;

\echo
\echo '== Plan: residente, alertas de mi sector =='
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'res_id'::text, 'role', 'authenticated')::text, true);
set local role authenticated;
explain (analyze, buffers, costs off, timing off) select a.id from public.alertas a order by a.creada_en desc, a.id limit 20;
rollback;

\echo
\echo '== Plan: directiva, reporte mensual =='
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'dir_id'::text, 'role', 'authenticated')::text, true);
set local role authenticated;
explain (analyze, buffers, costs off, timing off) select mes, total from public.reporte_incidencias_mensual
  where mes >= date_trunc('month', now() at time zone 'America/Lima')::date - interval '11 months';
rollback;

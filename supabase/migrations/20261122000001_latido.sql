-- =====================================================================
-- NeighborGood · Parte 9: función latido (RNF2, disponibilidad)
--
-- El plan gratuito de Supabase pausa el proyecto si pasa una semana sin actividad de base de datos (pasó
-- el 21 nov. 2026: la app dejó de conectar hasta que se restauró a mano). Un ping a la API de Auth no
-- cuenta, porque no ejecuta consultas en Postgres; y como la parte 5 le quita al rol anon todos los
-- permisos sobre las tablas, un ping sin sesión tampoco puede leer ninguna.
--
-- latido() es la consulta mínima que sí cuenta: devuelve 1 y no lee ninguna tabla, así que no expone
-- ningún dato ni da permisos sobre ellas. La llama cada pocos días el workflow
-- .github/workflows/latido-supabase.yml con la llave pública (rol anon).
--
-- Es SECURITY INVOKER: no hereda privilegios de nadie. El permiso de ejecución se quita a PUBLIC y se da
-- solo a anon y authenticated.
--
-- Se relaciona con: la parte 5 (permisos de anon) y el workflow de latido. Se prueba en
-- supabase/tests/database/09_latido.test.sql.
-- =====================================================================
begin;

-- Responde 1 para dejar constancia de actividad en la base. No recibe parámetros ni lee tablas.
create or replace function public.latido()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select 1;
$$;

comment on function public.latido() is
  'RNF2: consulta mínima para que el plan gratuito de Supabase no pause el proyecto. No lee tablas.';

-- Solo los roles de la API pueden ejecutarla (PUBLIC la tendría por defecto).
revoke all on function public.latido() from public;
grant execute on function public.latido() to anon, authenticated;

commit;

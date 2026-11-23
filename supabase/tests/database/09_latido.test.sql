-- Pruebas de la función latido (RNF2): el rol anon puede ejecutarla y recibe 1, pero sigue sin poder leer
-- ninguna tabla. Así se comprueba que el latido mantiene activo el proyecto sin abrir un hueco en RLS.
--
-- Se relaciona con: la migración 9 (la función que se prueba) y la 5 (permisos de anon).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ───────────── Permisos de ejecución ─────────────
select ok(has_function_privilege('anon', 'public.latido()', 'execute'),
  'anon puede ejecutar latido()');
select ok(has_function_privilege('authenticated', 'public.latido()', 'execute'),
  'authenticated puede ejecutar latido()');

-- ───────────── Resultado como anon ─────────────
set local role anon;
select is(public.latido(), 1, 'latido() devuelve 1 sin sesión');

-- El latido no cambia nada más: anon sigue sin poder leer las tablas (parte 5).
select throws_ok($$ select * from public.sectores $$, '42501', null,
  'anon sigue sin poder leer el catálogo de sectores');
select throws_ok($$ select * from public.perfiles $$, '42501', null,
  'anon sigue sin poder leer los perfiles');
reset role;

select * from finish();
rollback;

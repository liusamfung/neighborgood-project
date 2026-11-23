-- Pruebas de la función correo_habilitado (RF1): responde si un correo puede registrarse. Comprueban
-- que acepta un alta sin usar (sin importar mayúsculas ni espacios), que rechaza un correo desconocido,
-- un alta ya usada y una unidad deshabilitada, y que la puede llamar alguien sin sesión (anon) sin que
-- eso le deje leer la tabla residentes_habilitados. Usan los datos de seed.sql.
-- Usuarios del seed: directiva 90..01; residente1 (unidad A-101) ya se registró con su alta.
--
-- Se relaciona con: la migración 9 (`20261121000001_correo_habilitado.sql`), las tablas
-- residentes_habilitados y unidades (parte 1) y las políticas de la parte 5.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Un alta nueva, sin usar, en la unidad A-102 (creada por la directiva del seed).
insert into public.residentes_habilitados (unidad_id, nombre, correo, creado_por) values
  ('20000000-0000-0000-0000-000000000002', 'Nuevo Vecino', 'nuevo@neighborgood.test',
   '90000000-0000-0000-0000-000000000001');

select ok(public.correo_habilitado('nuevo@neighborgood.test'),
  'Un correo dado de alta y sin usar puede registrarse');
select ok(public.correo_habilitado('  Nuevo@NeighborGood.TEST  '),
  'Se normaliza igual que la tabla: mayúsculas y espacios no importan');
select ok(not public.correo_habilitado('desconocido@neighborgood.test'),
  'Un correo que la directiva no dio de alta no puede registrarse');
select ok(not public.correo_habilitado('residente1@neighborgood.test'),
  'Un alta que ya se usó para registrarse no vale otra vez');

-- Si la directiva deshabilita la unidad, su alta pendiente deja de valer.
update public.unidades set habilitada = false where id = '20000000-0000-0000-0000-000000000002';
select ok(not public.correo_habilitado('nuevo@neighborgood.test'),
  'Un alta de una unidad deshabilitada no puede registrarse');
update public.unidades set habilitada = true where id = '20000000-0000-0000-0000-000000000002';

-- Quien se registra no tiene sesión: la función responde, pero la tabla sigue cerrada para anon.
set local role anon;
select ok(public.correo_habilitado('nuevo@neighborgood.test'),
  'anon puede preguntar si un correo está habilitado');
select throws_ok($$ select count(*) from public.residentes_habilitados $$, '42501',
  null, 'anon sigue sin poder leer la lista de correos habilitados');
reset role;

select * from finish();
rollback;

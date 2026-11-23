-- RF27: personal concurrente, duplicados, cierre final y permisos del emisor.
-- Usa solo seed local; cada archivo revierte datos y ayudantes con ROLLBACK.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
create schema tests;
grant usage on schema tests to public;
-- Simula un JWT normal sin dar privilegios administrativos al rol autenticado.
create function tests.como(p_uid uuid) returns void language plpgsql as $$ begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',p_uid::text,true);
  set local role authenticated;
end $$;
-- Vuelve al propietario local para comprobar el estado persistido y terminar el test.
create function tests.admin() returns void language plpgsql as $$ begin reset role; end $$;
grant execute on all functions in schema tests to public;
insert into public.alertas(id,emisor_id,unidad_id,tipo) values
 ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000001','medica');
select tests.como('90000000-0000-0000-0000-000000000011');
select throws_ok($$insert into public.alerta_atenciones(alerta_id,usuario_id,estado) values ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000011','en_camino')$$,'42501',null,'El residente emisor no puede responder como personal');
select tests.como('90000000-0000-0000-0000-000000000002');
select lives_ok($$insert into public.alerta_atenciones(alerta_id,usuario_id,estado) values ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','en_camino')$$,'El guardia registra su respuesta');
select throws_ok($$insert into public.alerta_atenciones(alerta_id,usuario_id,estado) values ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','en_camino')$$,'23505',null,'Un reintento del mismo guardia no duplica la bitácora');
select tests.como('90000000-0000-0000-0000-000000000001');
select lives_ok($$insert into public.alerta_atenciones(alerta_id,usuario_id,estado) values ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','en_camino')$$,'Otra persona de la directiva también puede ir en camino');
select is((select count(*)::int from public.alerta_atenciones where alerta_id='b9000000-0000-0000-0000-000000000001'),2,'Se conservaron las dos respuestas diferentes sin duplicados');
select lives_ok($$insert into public.alerta_atenciones(alerta_id,usuario_id,estado) values ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','atendida')$$,'La directiva confirma que fue atendida');
select throws_ok($$insert into public.alerta_atenciones(alerta_id,usuario_id,estado) values ('b9000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','en_camino')$$,'23514',null,'Una alerta atendida no vuelve a activarse');
select tests.como('90000000-0000-0000-0000-000000000011');
select is((select estado::text from public.alertas where id='b9000000-0000-0000-0000-000000000001'),'atendida','El emisor lee el estado final');
select is((select count(*)::int from public.alerta_atenciones where alerta_id='b9000000-0000-0000-0000-000000000001'),3,'El emisor lee la bitácora completa');
select tests.como('90000000-0000-0000-0000-000000000013');
select is((select count(*)::int from public.alerta_atenciones where alerta_id='b9000000-0000-0000-0000-000000000001'),0,'Otro residente no puede leer la bitácora');
select tests.admin();
select * from finish();
rollback;

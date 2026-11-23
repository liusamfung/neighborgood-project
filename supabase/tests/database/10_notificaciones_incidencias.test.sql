-- RF30: encolado transaccional, ausencia de duplicados y privacidad del reportante.
-- Usa seed local, no crea webhook ni envía push; todo se revierte al finalizar.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
create schema tests;
grant usage on schema tests to public;
-- Cambia solo el JWT/rol de esta transacción para comprobar los permisos reales.
create function tests.como(p_uid uuid) returns void language plpgsql as $$ begin
  reset role;
  perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',p_uid::text,true);
  set local role authenticated;
end $$;
-- Recupera el rol de ejecución local sin modificar usuarios del servidor compartido.
create function tests.admin() returns void language plpgsql as $$ begin reset role; end $$;
grant execute on all functions in schema tests to public;
insert into public.incidencias(id,reportado_por,unidad_id,descripcion,ubicacion) values
 ('b3000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000001','Prueba aislada RF30','Hall sintético');
select is((select count(*)::int from public.incidencia_notificaciones where incidencia_id='b3000000-0000-0000-0000-000000000001'),0,'Crear un reporte no notifica un cambio inexistente');
select tests.como('90000000-0000-0000-0000-000000000001');
update public.incidencias set estado='en_atencion' where id='b3000000-0000-0000-0000-000000000001';
select throws_ok($$select * from public.incidencia_notificaciones$$,'42501',null,'La directiva no lee tokens ni eventos privados de push');
select tests.admin();
select is((select count(*)::int from public.incidencia_notificaciones where incidencia_id='b3000000-0000-0000-0000-000000000001'),1,'Un cambio crea un evento');
select is((select reportado_por::text from public.incidencia_notificaciones where incidencia_id='b3000000-0000-0000-0000-000000000001'),'90000000-0000-0000-0000-000000000011','El destinatario es el reportante persistido');
select is((select estado_envio from public.incidencia_notificaciones where incidencia_id='b3000000-0000-0000-0000-000000000001'),'pendiente','El guardado no se confunde con una push recibida');
select tests.como('90000000-0000-0000-0000-000000000001');
update public.incidencias set estado='en_atencion' where id='b3000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select count(*)::int from public.incidencia_notificaciones where incidencia_id='b3000000-0000-0000-0000-000000000001'),1,'Repetir el mismo estado no encola otra push');
savepoint cambio_revertido;
update public.incidencias set estado='resuelto' where id='b3000000-0000-0000-0000-000000000001';
rollback to cambio_revertido;
select is((select count(*)::int from public.incidencia_notificaciones where incidencia_id='b3000000-0000-0000-0000-000000000001'),1,'Un rollback tampoco deja notificaciones huérfanas');
select tests.como('90000000-0000-0000-0000-000000000011');
select results_eq($$update public.incidencias set estado='resuelto' where id='b3000000-0000-0000-0000-000000000001' returning id$$,
  $$select null::uuid where false$$,'RLS impide que el residente actualice filas');
select throws_ok($$select * from public.incidencia_notificaciones$$,'42501',null,'El residente no accede a la cola privada');
select tests.admin();
select ok((select relrowsecurity from pg_class where oid='public.incidencia_notificaciones'::regclass),'La cola mantiene RLS');
select ok(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='incidencias'),'Realtime de incidencias está habilitado');
select * from finish();
rollback;

-- RF12: señales transaccionales y permiso de conteos, sin publicar votos individuales.
-- El contador de prueba observa UPDATE de encuestas; no simula recepción en un teléfono.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
create schema tests;
grant usage on schema tests to public;
create table tests.senales(encuesta_id uuid);
-- Captura únicamente la señal que después del COMMIT consumiría Realtime.
create function tests.capturar() returns trigger language plpgsql security definer as $$ begin
  insert into tests.senales values(new.id); return null;
end $$;
create trigger trg_test_senal after update on public.encuestas for each row execute function tests.capturar();
-- Simula la sesión normal de un residente local de seed.sql.
create function tests.como(p_uid uuid) returns void language plpgsql as $$ begin
  reset role;
  perform set_config('request.jwt.claims',json_build_object('sub',p_uid,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',p_uid::text,true);
  set local role authenticated;
end $$;
-- Vuelve al rol local para inspeccionar el contador y finalizar el archivo.
create function tests.admin() returns void language plpgsql as $$ begin reset role; end $$;
grant execute on all functions in schema tests to public;
insert into public.encuestas(id,autor_id,categoria_id,titulo,resultados_en_vivo,abre_en,cierra_en) values
 ('b1200000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','RF12 abierta',true,now()-interval '1 hour',now()+interval '1 hour'),
 ('b1200000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','RF12 reservada',false,now()-interval '1 hour',now()+interval '1 hour');
insert into public.encuesta_preguntas(id,encuesta_id,texto,orden) values
 ('b1210000-0000-0000-0000-000000000001','b1200000-0000-0000-0000-000000000001','Elegir',1),
 ('b1210000-0000-0000-0000-000000000002','b1200000-0000-0000-0000-000000000002','Elegir',1);
insert into public.encuesta_opciones(id,pregunta_id,texto,orden) values
 ('b1220000-0000-0000-0000-000000000001','b1210000-0000-0000-0000-000000000001','A',1),
 ('b1220000-0000-0000-0000-000000000002','b1210000-0000-0000-0000-000000000002','A',1);
savepoint voto_revertido;
insert into public.votos(encuesta_id,unidad_id,usuario_id) values ('b1200000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000011');
rollback to voto_revertido;
select is((select count(*)::int from tests.senales),0,'Un voto revertido tampoco deja una señal');
select tests.como('90000000-0000-0000-0000-000000000011');
select lives_ok($$select public.emitir_voto('b1200000-0000-0000-0000-000000000001','[{"pregunta_id":"b1210000-0000-0000-0000-000000000001","opcion_id":"b1220000-0000-0000-0000-000000000001"}]'::jsonb)$$,'Votar mediante la RPC conserva el flujo existente');
select lives_ok($$select public.emitir_voto('b1200000-0000-0000-0000-000000000002','[{"pregunta_id":"b1210000-0000-0000-0000-000000000002","opcion_id":"b1220000-0000-0000-0000-000000000002"}]'::jsonb)$$,'También se puede votar con resultados reservados');
select throws_ok($$select * from public.resultados_encuesta('b1200000-0000-0000-0000-000000000002')$$,'42501',null,'El residente no ve conteos reservados antes del cierre');
select tests.admin();
select is((select count(*)::int from tests.senales where encuesta_id='b1200000-0000-0000-0000-000000000001'),1,'La encuesta en vivo emite una señal');
select is((select count(*)::int from tests.senales where encuesta_id='b1200000-0000-0000-0000-000000000002'),0,'El voto reservado no revela señales de participación');
update public.encuestas set cierra_en=now()-interval '1 minute' where id='b1200000-0000-0000-0000-000000000002';
select tests.como('90000000-0000-0000-0000-000000000011');
select is((select total from public.resultados_encuesta('b1200000-0000-0000-0000-000000000002')),1::bigint,'El residente accede al conteo al llegar el cierre');
select tests.admin();
select ok(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='encuestas'),'Se publican metadatos de encuestas');
select ok(not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='votos'),'No se publican votos individuales');
select * from finish();
rollback;

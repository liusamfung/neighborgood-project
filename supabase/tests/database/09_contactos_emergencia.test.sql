-- RF4: comprueba el ciclo completo de contactos con RLS y el hueco que deja una eliminación.
-- Usa el seed únicamente en la base temporal de windows:pruebas; toda escritura termina en rollback.
-- Se relaciona con las migraciones 1, 2 y 5 y con src/repositorios/contactos.ts. No requiere cambiar
-- políticas ni ejecutar una migración nueva para completar la pantalla P8.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

create schema pruebas_rf4;
grant usage on schema pruebas_rf4 to authenticated;

-- Cambia el JWT y el rol SQL para probar operaciones como un residente real, sin service_role.
create function pruebas_rf4.como(p_uid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  set local role authenticated;
end $$;
grant execute on function pruebas_rf4.como(uuid) to authenticated;

select pruebas_rf4.como('90000000-0000-0000-0000-000000000011');
select is((select count(*)::int from public.contactos_emergencia), 2, 'RF4: el residente empieza con sus dos contactos');
select lives_ok($$
  insert into public.contactos_emergencia (id, usuario_id, nombre, telefono, parentesco, correo, orden)
  values ('f1400000-0000-4000-8000-000000000003', '90000000-0000-0000-0000-000000000011',
    'Prueba RF4', '+51 999 000 003', 'Amiga', null, 3)
$$, 'RF4: agrega el tercero con correo opcional nulo');
select is((select count(*)::int from public.contactos_emergencia), 3, 'RF4: se alcanza 3 de 3');
select throws_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
  values ('90000000-0000-0000-0000-000000000011', 'Cuarto', '999000004', 4)
$$, '23514', null, 'RF4: la base rechaza el cuarto aunque se omita la interfaz');
select throws_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
  values ('90000000-0000-0000-0000-000000000011', 'Colision simultanea', '999000004', 3)
$$, '23505', null, 'RF4: dos inserciones no pueden ocupar la misma posición');
select lives_ok($$
  update public.contactos_emergencia set nombre = 'RF4 editado', parentesco = 'Vecina', correo = 'rf4@example.test'
  where id = 'f1400000-0000-4000-8000-000000000003'
$$, 'RF4: se editan los datos propios');
select is((select correo from public.contactos_emergencia where orden = 3), 'rf4@example.test', 'RF4: la edición persiste');

-- Otro residente de la misma vivienda tampoco tiene acceso a la agenda privada del primero.
select pruebas_rf4.como('90000000-0000-0000-0000-000000000012');
select is((select count(*)::int from public.contactos_emergencia), 0, 'RF4: otro residente no ve los contactos');
with intento as (
  update public.contactos_emergencia set nombre = 'Intrusión' where id = 'f1400000-0000-4000-8000-000000000003' returning id
) select is((select count(*)::int from intento), 0, 'RF4: otro residente no puede editarlos');
with intento as (
  delete from public.contactos_emergencia where id = 'f1400000-0000-4000-8000-000000000003' returning id
) select is((select count(*)::int from intento), 0, 'RF4: otro residente no puede borrarlos');
select throws_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, orden)
  values ('90000000-0000-0000-0000-000000000011', 'Ajeno', '999000005', 1)
$$, '42501', null, 'RF4: otro residente no puede crear a nombre del propietario');

select pruebas_rf4.como('90000000-0000-0000-0000-000000000011');
select is((select nombre from public.contactos_emergencia where orden = 3), 'RF4 editado', 'RF4: el contacto sigue intacto tras los intentos ajenos');
select throws_ok($$
  update public.contactos_emergencia set usuario_id = '90000000-0000-0000-0000-000000000013'
  where id = 'f1400000-0000-4000-8000-000000000003'
$$, '42501', null, 'RF4: ni el propietario puede transferir la fila a otro usuario');
with borrado as (
  delete from public.contactos_emergencia where usuario_id = '90000000-0000-0000-0000-000000000011' and orden = 2 returning id
) select is((select count(*)::int from borrado), 1, 'RF4: el propietario puede eliminar un contacto intermedio');
select is((select count(*)::int from public.contactos_emergencia), 2, 'RF4: vuelve a quedar espacio');
select lives_ok($$
  insert into public.contactos_emergencia (usuario_id, nombre, telefono, parentesco, orden)
  values ('90000000-0000-0000-0000-000000000011', 'RF4 reemplazo', '999000006', 'Hermano', 2)
$$, 'RF4: se reutiliza la posición intermedia sin renumerar los otros contactos');
select results_eq('select orden::int from public.contactos_emergencia order by orden', array[1,2,3], 'RF4: las tres posiciones quedan válidas');
select lives_ok($$
  update public.contactos_emergencia set correo = null where id = 'f1400000-0000-4000-8000-000000000003'
$$, 'RF4: se puede retirar el correo opcional');

reset role;
select * from finish();
rollback;

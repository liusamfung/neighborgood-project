-- =====================================================================
-- NeighborGood · Parte 6 de 6: Storage (buckets y políticas)
--
-- Dos buckets privados:
--   · avisos:      imagen opcional de un aviso (RF7). Escribe la directiva; leen los usuarios activos.
--   · incidencias: fotos de una incidencia (RF29, de 1 a 3). Convención de ruta:
--                  {usuario_id}/{incidencia_id}/{orden}.jpg
--                  Escribe el residente dentro de su carpeta; leen el dueño y la directiva.
-- storage.objects también es una tabla: la regla "RLS en todas las tablas" aplica aquí.
-- =====================================================================
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avisos',      'avisos',      false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('incidencias', 'incidencias', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ───────────── avisos ─────────────
create policy "storage avisos: leen los usuarios activos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avisos' and privado.es_usuario_activo());

create policy "storage avisos: la directiva sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avisos' and privado.es_directiva());

create policy "storage avisos: la directiva reemplaza" on storage.objects
  for update to authenticated
  using (bucket_id = 'avisos' and privado.es_directiva())
  with check (bucket_id = 'avisos' and privado.es_directiva());

create policy "storage avisos: la directiva borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avisos' and privado.es_directiva());

-- ───────────── incidencias ─────────────
create policy "storage incidencias: leen el dueño y la directiva" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'incidencias'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or privado.es_directiva())
  );

create policy "storage incidencias: el residente sube en su carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'incidencias'
    and privado.es_residente()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "storage incidencias: el residente borra de su carpeta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'incidencias'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- =====================================================================
-- NeighborGood · catálogo inicial para el proyecto REAL (sin usuarios)
--
-- Crea los sectores, las unidades y las categorías de avisos del condominio ficticio
-- "Los Álamos". Sin esto no se puede habilitar a ningún residente, porque todo
-- residente necesita una unidad. No crea cuentas ni contraseñas.
--
-- Es seguro ejecutarlo más de una vez (no duplica nada). Ejecútalo en el SQL Editor
-- después de las 6 partes de la migración. Más adelante la directiva administrará
-- estos datos desde la app; mientras tanto se cargan así.
-- =====================================================================
begin;

insert into public.sectores (nombre, tipo) values
  ('Torre A',    'torre'),
  ('Torre B',    'torre'),
  ('Pabellón C', 'pabellon')
on conflict (tipo, nombre) do nothing;

insert into public.unidades (sector_id, codigo)
select s.id, v.codigo
  from (values
    ('Torre A',    'A-101'), ('Torre A',    'A-102'), ('Torre A',    'A-201'), ('Torre A',    'A-202'),
    ('Torre B',    'B-101'), ('Torre B',    'B-102'), ('Torre B',    'B-201'), ('Torre B',    'B-202'),
    ('Pabellón C', 'C-1'),   ('Pabellón C', 'C-2'),   ('Pabellón C', 'C-3'),   ('Pabellón C', 'C-4')
  ) as v (sector, codigo)
  join public.sectores s on s.nombre = v.sector
on conflict (sector_id, codigo) do nothing;

insert into public.categorias_aviso (nombre) values
  ('Mantenimiento'), ('Seguridad'), ('Eventos'), ('Pagos'), ('Otros')
on conflict (nombre) do nothing;

commit;

-- Comprobación: debe devolver 3 sectores, 12 unidades y 5 categorías.
select (select count(*) from public.sectores)         as sectores,
       (select count(*) from public.unidades)         as unidades,
       (select count(*) from public.categorias_aviso) as categorias;

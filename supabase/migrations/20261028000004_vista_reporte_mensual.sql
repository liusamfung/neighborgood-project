-- =====================================================================
-- NeighborGood · Parte 4 de 6: vista del reporte mensual de incidencias (RF31)
-- security_invoker = true: la vista respeta las políticas RLS de quien la consulta
-- (la directiva ve todas las incidencias; un residente solo vería las suyas).
-- Los meses se calculan en la zona horaria America/Lima, no en UTC.
-- Los permisos de la vista se otorgan en la parte 5.
-- =====================================================================
begin;

create or replace view public.reporte_incidencias_mensual
with (security_invoker = true)
as
select
  date_trunc('month', i.creada_en at time zone 'America/Lima')::date as mes,
  count(*)                                              as total,
  count(*) filter (where i.estado = 'pendiente')        as pendientes,
  count(*) filter (where i.estado = 'en_atencion')      as en_atencion,
  count(*) filter (where i.estado = 'resuelto')         as resueltas
from public.incidencias i
group by 1
order by 1;

comment on view public.reporte_incidencias_mensual is
  'Incidencias por mes (zona America/Lima) y estado. Alimenta la gráfica mensual de la directiva (RF31).';

commit;

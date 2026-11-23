/**
 * Hook del historial de alertas (RF28): páginas de alertas filtradas por tipo y estado.
 *
 * Qué hace: expone una consulta infinita de TanStack Query sobre `listarHistorialAlertas`; cada vez que
 * cambian los filtros empieza de nuevo desde la primera página.
 * Cómo funciona: la clave empieza con `['alertas']`, así que cuando llega o cambia una alerta (RF25, RF27)
 * las demás pantallas la marcan como vencida y el historial se vuelve a consultar solo.
 * Se usa con: `src/componentes/alertas/HistorialAlertas.tsx`.
 * Depende de: `src/repositorios/historialAlertas.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { ALERTAS_POR_PAGINA, listarHistorialAlertas } from '@/repositorios/historialAlertas';
import type { FiltrosHistorialAlertas } from '@/tipos/historialAlertas';

/**
 * Consulta el historial con los filtros dados.
 *
 * @param filtros tipo y estado elegidos (`null` = todos).
 */
export function useHistorialAlertas(filtros: FiltrosHistorialAlertas) {
  return useInfiniteQuery({
    queryKey: ['alertas', 'historial', filtros.tipo, filtros.estado],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listarHistorialAlertas(filtros, pageParam),
    // Una página llena puede tener más detrás; una incompleta es la última.
    getNextPageParam: (filas, paginas) =>
      filas.length === ALERTAS_POR_PAGINA ? paginas.length : undefined,
  });
}

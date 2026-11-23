/**
 * Hook para reportar una incidencia: la mutación de TanStack Query sobre `reportarIncidencia` (RF29).
 *
 * Qué hace: expone `mutate`/`mutateAsync` con los estados de envío (`isPending`, `error`) y, al enviar con
 * éxito, marca como vencida la caché `['incidencias']` para que las listas de incidencias (RF30 y RF31)
 * vuelvan a consultar y muestren la nueva.
 * Se usa con: `src/app/residente/incidencias/nueva.tsx`.
 * Depende de: `src/repositorios/reportarIncidencia.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reportarIncidencia } from '@/repositorios/reportarIncidencia';
import type { BorradorReporte } from '@/tipos/reporteIncidencia';

/** Mutación que envía un `BorradorReporte` del residente `usuarioId` y devuelve el id de la incidencia. */
export function useReportarIncidencia(usuarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (borrador: BorradorReporte) => reportarIncidencia(usuarioId, borrador),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

/**
 * Hook para anular un pase: la mutación de TanStack Query sobre `anularPase` (RF22).
 *
 * Qué hace: expone `mutate` con el estado de envío y, al anular con éxito, marca como vencida la caché
 * `['pases']` para que la lista "Mis pases" (`useMisPases`) vuelva a consultar y muestre el pase como
 * Anulado.
 * Se usa con: `src/componentes/visitas/BotonAnularPase.tsx`.
 * Depende de: `src/repositorios/pases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { anularPase } from '@/repositorios/pases';

/** Mutación que anula el pase cuyo id recibe `mutate`. */
export function useAnularPase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: anularPase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pases'] }),
  });
}

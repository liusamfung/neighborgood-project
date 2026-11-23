/**
 * Hook para registrar la salida de una visita: la mutación de TanStack Query sobre `registrarSalida` (RF20).
 *
 * Qué hace: expone `mutate` con los estados de envío y, al registrar la salida, marca como vencida la caché
 * `['visitas-hoy']` para que la lista muestre la hora de salida.
 * Se usa con: `src/componentes/visitas/TarjetaVisita.tsx`.
 * Depende de: `src/repositorios/validacionPases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { registrarSalida } from '@/repositorios/validacionPases';

/** Mutación que recibe el `id` del pase y devuelve la salida registrada. */
export function useRegistrarSalida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarSalida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitas-hoy'] }),
  });
}

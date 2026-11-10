/**
 * Hook para publicar una encuesta: la mutación de TanStack Query sobre `crearEncuesta`.
 *
 * Qué hace: expone `mutate`/`mutateAsync` con los estados de envío (`isPending`, `error`) y, al
 * publicar con éxito, marca como vencida la caché `['encuestas']` para que las listas de encuestas
 * (RF11, RF12) vuelvan a consultar y muestren la nueva.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx`.
 * Depende de: `src/repositorios/encuestas.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { crearEncuesta } from '@/repositorios/encuestas';

/** Mutación que publica un `BorradorEncuesta` y devuelve el id de la encuesta creada. */
export function useCrearEncuesta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearEncuesta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['encuestas'] }),
  });
}

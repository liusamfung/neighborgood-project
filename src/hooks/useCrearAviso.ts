/**
 * Hook para publicar un aviso: la mutación de TanStack Query sobre `crearAviso`.
 *
 * Qué hace: expone `mutate`/`mutateAsync` con los estados de envío (`isPending`, `error`) y, al
 * publicar con éxito, marca como vencida la caché `['avisos']` para que las listas de avisos
 * (RF10, RF11) vuelvan a consultar y muestren el nuevo.
 * Se usa con: `src/app/directiva/avisos/nuevo.tsx`.
 * Depende de: `src/repositorios/avisos.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { crearAviso } from '@/repositorios/avisos';

/** Mutación que publica un `BorradorAviso` y devuelve el id del aviso creado. */
export function useCrearAviso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearAviso,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['avisos'] }),
  });
}

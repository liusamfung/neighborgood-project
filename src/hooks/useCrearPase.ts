/**
 * Hook para crear un pase de visita: la mutación de TanStack Query sobre `crearPase`.
 *
 * Qué hace: expone `mutate`/`mutateAsync` con los estados de envío (`isPending`, `error`) y, al crear el
 * pase con éxito, marca como vencida la caché `['pases']` para que la lista "Mis pases" vuelva a consultar
 * y muestre el nuevo.
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`.
 * Depende de: `src/repositorios/pases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { crearPase } from '@/repositorios/pases';

/** Mutación que crea un pase con un `BorradorPase` y devuelve el pase creado. */
export function useCrearPase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearPase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pases'] }),
  });
}

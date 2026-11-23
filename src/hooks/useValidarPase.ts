/**
 * Hook para validar un pase en la garita: la mutación de TanStack Query sobre `validarPase` (RF18, RF19).
 *
 * Qué hace: expone `mutate` con los estados de envío (`isPending`, `error`). Es una mutación y no una
 * consulta porque cada escaneo válido cambia el pase a `usado`: no se debe repetir ni guardar en caché.
 * Se usa con: `src/app/guardia/(tabs)/escaner.tsx`.
 * Depende de: `src/repositorios/validacionPases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation } from '@tanstack/react-query';

import { validarPase } from '@/repositorios/validacionPases';

/** Mutación que recibe el código del QR y devuelve el pase válido (o lanza el motivo del rechazo). */
export function useValidarPase() {
  return useMutation({ mutationFn: validarPase });
}

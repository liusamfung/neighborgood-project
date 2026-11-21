/**
 * Hook de las encuestas abiertas: la consulta de TanStack Query sobre `listarEncuestasAbiertas`.
 *
 * Qué hace: entrega las encuestas que el residente puede responder ahora, con las obligatorias
 * primero (RF14), filtradas por categoría si se pide (RF10). La llave empieza con 'encuestas', así
 * que cuando la directiva publica una nueva, `useCrearEncuesta` invalida esta caché y la lista se
 * refresca sola.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (P4).
 * Depende de: `src/repositorios/encuestas.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQuery } from '@tanstack/react-query';

import { listarEncuestasAbiertas } from '@/repositorios/encuestas';

/**
 * Encuestas abiertas visibles para el usuario.
 *
 * @param categoriaId id de la categoría elegida (RF10); `null` trae todas.
 */
export function useEncuestasAbiertas(categoriaId: string | null) {
  return useQuery({
    queryKey: ['encuestas', 'abiertas', categoriaId ?? 'todas'],
    queryFn: () => listarEncuestasAbiertas(categoriaId),
  });
}

/**
 * Hook de la lista de avisos: la consulta de TanStack Query sobre `listarAvisos` (RF10, RF11).
 *
 * Qué hace: entrega los avisos visibles para el usuario, filtrados por categoría si se pide, con
 * los estados de carga (`isPending`, `isError`, `refetch`). Cada categoría tiene su propia llave de
 * caché, así cambiar de filtro no repite consultas ya hechas; y `useCrearAviso` invalida `['avisos']`
 * al publicar, con lo que todas las variantes se refrescan solas.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (P4).
 * Depende de: `src/repositorios/avisos.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQuery } from '@tanstack/react-query';

import { listarAvisos } from '@/repositorios/avisos';

/**
 * Avisos visibles para el usuario, del más reciente al más antiguo.
 *
 * @param categoriaId id de la categoría elegida (RF10); `null` trae todas.
 */
export function useAvisos(categoriaId: string | null) {
  return useQuery({
    // La llave incluye la categoría: cada filtro guarda su propia caché bajo el prefijo 'avisos'.
    queryKey: ['avisos', categoriaId ?? 'todas'],
    queryFn: () => listarAvisos(categoriaId),
  });
}

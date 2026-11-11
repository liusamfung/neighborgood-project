/**
 * Hook de los pases del residente: la lista en caché con TanStack Query.
 *
 * Qué hace: entrega los pases del residente con sesión (`data`, `isPending`, `isError`, `refetch`...). La
 * clave `['pases']` es la que invalida `useCrearPase` al crear uno nuevo.
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`.
 * Depende de: `src/repositorios/pases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQuery } from '@tanstack/react-query';

import { listarMisPases } from '@/repositorios/pases';

/** Pases del residente, los más recientes primero. */
export function useMisPases() {
  return useQuery({ queryKey: ['pases'], queryFn: listarMisPases });
}

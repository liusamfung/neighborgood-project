/**
 * Hook de las visitas de hoy del guardia: la lista en caché con TanStack Query (RF20).
 *
 * Qué hace: entrega las visitas del día (`data`, `isPending`, `isError`, `refetch`...). La clave
 * `['visitas-hoy']` la invalidan `useValidarPase` (un ingreso nuevo) y `useRegistrarSalida`.
 * Se usa con: `src/app/guardia/visitas.tsx`.
 * Depende de: `src/repositorios/validacionPases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQuery } from '@tanstack/react-query';

import { listarVisitasDeHoy } from '@/repositorios/validacionPases';

/** Visitas de hoy: primero las que están adentro o ya salieron, luego las esperadas. */
export function useVisitasDeHoy() {
  return useQuery({ queryKey: ['visitas-hoy'], queryFn: listarVisitasDeHoy });
}

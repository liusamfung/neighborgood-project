/**
 * Hooks de catálogos: las categorías y los sectores en caché con TanStack Query.
 *
 * Qué hace: entrega las listas que necesitan los formularios de la directiva y las guarda 10 minutos,
 * porque casi nunca cambian; así abrir otra pantalla no repite la consulta.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx` y `src/app/directiva/avisos/nuevo.tsx`.
 * Depende de: `src/repositorios/catalogos.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQuery } from '@tanstack/react-query';

import { listarCategorias, listarSectores } from '@/repositorios/catalogos';

// Los catálogos cambian muy poco: se consideran frescos 10 minutos.
const DIEZ_MINUTOS = 10 * 60 * 1000;

/** Categorías de avisos y encuestas (`data`, `isPending`, `isError`, `refetch`...). */
export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: listarCategorias, staleTime: DIEZ_MINUTOS });
}

/** Sectores del condominio, para dirigir una encuesta (RF13). */
export function useSectores() {
  return useQuery({ queryKey: ['sectores'], queryFn: listarSectores, staleTime: DIEZ_MINUTOS });
}

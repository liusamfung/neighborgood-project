/**
 * Hooks de TanStack Query para leer encuestas, votar y ver resultados (RF9, RF11, RF12).
 *
 * Qué hace: entrega la lista de encuestas, el detalle de una, sus resultados y la mutación de voto.
 * La clave `['encuestas']` es la que invalida `useCrearEncuesta`; votar también la invalida para que
 * la lista muestre "Tu unidad ya votó" y los resultados se actualicen.
 * Se usa con: las pestañas Avisos (residente) y Encuestas (directiva), `src/app/residente/encuesta/[id].tsx`
 * y `src/app/directiva/encuestas/[id]/resultados.tsx`.
 * Depende de: `src/repositorios/encuestas.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  emitirVoto,
  listarEncuestas,
  obtenerEncuesta,
  resultadosEncuesta,
  type OpcionElegida,
} from '@/repositorios/encuestas';

/** Encuestas que RLS deja ver al usuario, de la más reciente a la más antigua. */
export function useEncuestas() {
  return useQuery({ queryKey: ['encuestas'], queryFn: listarEncuestas });
}

/** Una encuesta con sus preguntas y opciones; `data` es `null` si no existe o no se puede ver. */
export function useEncuesta(encuestaId: string) {
  return useQuery({
    queryKey: ['encuestas', encuestaId],
    queryFn: () => obtenerEncuesta(encuestaId),
  });
}

/**
 * Conteo de votos por opción.
 *
 * @param encuestaId encuesta que se consulta.
 * @param activo false mientras el usuario todavía no puede ver los resultados (RF12): así no se
 * llama a la función solo para recibir un error de permiso.
 */
export function useResultadosEncuesta(encuestaId: string, activo: boolean) {
  return useQuery({
    queryKey: ['encuestas', encuestaId, 'resultados'],
    queryFn: () => resultadosEncuesta(encuestaId),
    enabled: activo,
  });
}

/** Mutación que emite el voto de la unidad en una encuesta (RF9). */
export function useEmitirVoto(encuestaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opciones: OpcionElegida[]) => emitirVoto(encuestaId, opciones),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['encuestas'] }),
  });
}

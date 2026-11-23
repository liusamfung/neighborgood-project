/**
 * Hooks del botón de pánico (RF23): enviar la alerta y leer la ubicación del residente.
 *
 * Qué hace: `useEmitirAlerta` expone la mutación de TanStack Query sobre `emitirAlerta`, con sus estados
 * (`isPending`, `error`), y al crear la alerta marca como vencida la caché `['alertas']` para que las
 * listas de alertas se vuelvan a consultar. `useUbicacion` consulta una vez el nombre de la unidad y su
 * sector y lo guarda en caché, así Inicio y "Enviar alerta" no lo piden dos veces.
 * Se usa con: `src/app/residente/(tabs)/index.tsx` y `src/app/residente/alerta/tipo.tsx`.
 * Depende de: `src/repositorios/emitirAlerta.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emitirAlerta, obtenerUbicacion } from '@/repositorios/emitirAlerta';
import type { TipoAlerta } from '@/tipos/alerta';

/** Lo que necesita enviar una alerta: quién la envía, desde qué unidad y de qué tipo. */
type DatosAlerta = { emisorId: string; unidadId: string; tipo: TipoAlerta };

/** Mutación que crea una alerta y devuelve la alerta creada. No reintenta sola: un envío incierto no se repite. */
export function useEmitirAlerta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ emisorId, unidadId, tipo }: DatosAlerta) =>
      emitirAlerta(emisorId, unidadId, tipo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertas'] }),
  });
}

/**
 * Consulta la ubicación (unidad y sector) del residente.
 *
 * @param unidadId id de la unidad; sin él (perfil sin unidad) la consulta no se hace.
 */
export function useUbicacion(unidadId: string | null | undefined) {
  return useQuery({
    queryKey: ['unidad', unidadId],
    queryFn: () => obtenerUbicacion(unidadId as string),
    enabled: Boolean(unidadId),
  });
}

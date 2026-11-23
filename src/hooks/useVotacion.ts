/**
 * RF9 con TanStack Query: carga la encuesta y el estado de voto de la unidad activa.
 * Lo consume P5; solo el repositorio votacion habla con Supabase.
 * La caché distingue sesión/unidad/encuesta y una escritura nunca se reintenta automáticamente.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emitirVoto, obtenerEncuestaVotacion, obtenerVotoUnidad } from '@/repositorios/votacion';
import type { OpcionVoto } from '@/tipos/votacion';

/** Consulta coordinada y envío atómico; vuelve a consultar incluso tras un envío incierto. */
export function useVotacion(id: string, usuarioId?: string, unidadId?: string | null) {
  const cliente = useQueryClient();
  const clave = ['votacion', usuarioId, unidadId, id] as const;
  const consulta = useQuery({
    queryKey: clave,
    enabled: Boolean(usuarioId && unidadId),
    staleTime: 0,
    queryFn: async () => {
      if (!usuarioId || !unidadId) throw new Error('Inicia sesión con una unidad asignada.');
      const [encuesta, votada] = await Promise.all([
        obtenerEncuestaVotacion(id),
        obtenerVotoUnidad(id, unidadId),
      ]);
      return { encuesta, votada };
    },
  });
  const envio = useMutation({
    retry: false,
    mutationFn: (opciones: OpcionVoto[]) => {
      if (!usuarioId || !unidadId) throw new Error('Inicia sesión con una unidad asignada.');
      return emitirVoto(id, opciones);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: clave }),
  });
  return { consulta, envio };
}

/**
 * Paginación RF11 con caché por sesión y filtros; lo consume HistorialPublicaciones.
 * Prefijos avisos/encuestas mantienen la invalidación de las publicaciones existentes.
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { useSesion } from '@/contexto/SesionContext';
import { listarHistorial, TAMANO_PAGINA_HISTORIAL } from '@/repositorios/historial';
import type { PeriodoHistorial, TipoPublicacion } from '@/tipos/historial';

/** Solo consulta con sesión y solicita otra página cuando la anterior llegó al tamaño máximo. */
export function useHistorial(
  tipo: TipoPublicacion,
  periodo: PeriodoHistorial,
  categoriaId: string | null,
) {
  const { perfil } = useSesion();
  return useInfiniteQuery({
    queryKey: [tipo, 'historial', perfil?.id, perfil?.rol, periodo, categoriaId],
    enabled: Boolean(perfil?.id),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listarHistorial(tipo, periodo, categoriaId, pageParam),
    getNextPageParam: (ultima, paginas) =>
      ultima.length === TAMANO_PAGINA_HISTORIAL ? paginas.length : undefined,
  });
}

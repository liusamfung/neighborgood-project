/** RF27: consultas por cuenta y actualización de alertas en primer plano.
 * La UI no accede al SDK: usa este hook y el repositorio alertas; la base autoriza las acciones.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useSesion } from '@/contexto/SesionContext';
import {
  escucharAlertas,
  listarAlertas,
  obtenerAlerta,
  responderAlerta,
} from '@/repositorios/alertas';

/** Solo mantiene el canal mientras la ruta está enfocada y la app está activa. */
function useActualizarAlertas(id?: string) {
  const { perfil } = useSesion();
  const cliente = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      if (!perfil?.id) return;
      let vigente = true;
      let detener: (() => void) | undefined;
      const actualizar = () => {
        if (vigente) void cliente.invalidateQueries({ queryKey: ['alertas', perfil.id] });
      };
      const conectar = () => {
        detener?.();
        detener = undefined;
        if (AppState.currentState === 'active') {
          actualizar();
          detener = escucharAlertas(id, actualizar);
        }
      };
      conectar();
      const listener = AppState.addEventListener('change', conectar);
      return () => {
        vigente = false;
        detener?.();
        listener.remove();
      };
    }, [perfil?.id, cliente, id]),
  );
}

/** Páginas de alertas; el residente ve solo sus emisiones, no la lista de vecinos. */
export function useListaAlertas() {
  const { perfil } = useSesion();
  useActualizarAlertas();
  return useInfiniteQuery({
    queryKey: ['alertas', perfil?.id, 'lista'],
    enabled: Boolean(perfil),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarAlertas(pageParam, perfil?.rol === 'residente' ? perfil.id : undefined),
    getNextPageParam: (filas, paginas) => (filas.length === 20 ? paginas.length : undefined),
  });
}

/** Invalidación tras éxito o fallo: ante conexión incierta se consulta antes de volver a intentar. */
export function useDetalleAlerta(id: string) {
  const { perfil } = useSesion();
  const cliente = useQueryClient();
  useActualizarAlertas(id);
  const consulta = useQuery({
    queryKey: ['alertas', perfil?.id, id],
    queryFn: () => obtenerAlerta(id),
    enabled: Boolean(perfil),
  });
  const responder = useMutation({
    retry: false,
    mutationFn: (estado: 'en_camino' | 'atendida') => {
      if (!perfil || !['guardia', 'directiva'].includes(perfil.rol))
        throw new Error('No autorizado');
      return responderAlerta(id, perfil.id, estado);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: ['alertas', perfil?.id] }),
  });
  return { consulta, responder };
}

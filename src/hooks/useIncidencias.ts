/** RF30: caché por cuenta/filtro y mutación sin reintento automático de cambios inciertos.
 * ListaIncidencias consume este hook; el repositorio es la única capa que accede a Supabase.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSesion } from '@/contexto/SesionContext';
import { actualizarIncidencia, listarIncidencias } from '@/repositorios/incidencias';
import type { EstadoIncidencia } from '@/tipos/incidencia';

/** Conserva filtros al volver, recupera datos y confirma el estado persistido después de cada intento. */
export function useIncidencias(estado?: EstadoIncidencia) {
  const { perfil } = useSesion();
  const cliente = useQueryClient();
  const consulta = useInfiniteQuery({
    queryKey: ['incidencias', perfil?.id, estado ?? 'todos'],
    enabled: Boolean(perfil),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listarIncidencias(pageParam, estado),
    getNextPageParam: (filas, paginas) => (filas.length === 20 ? paginas.length : undefined),
  });
  const { refetch } = consulta;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const cambiar = useMutation({
    retry: false,
    mutationFn: (dato: {
      id: string;
      anterior: EstadoIncidencia;
      version: string;
      estado: EstadoIncidencia;
    }) => {
      if (perfil?.rol !== 'directiva')
        throw new Error('Solo la directiva puede actualizar incidencias.');
      return actualizarIncidencia(dato.id, dato.anterior, dato.version, dato.estado);
    },
    onSettled: async () => {
      await cliente.invalidateQueries({ queryKey: ['incidencias', perfil?.id] });
      await cliente.invalidateQueries({ queryKey: ['reporte-incidencias'] });
    },
  });
  return { consulta, cambiar };
}

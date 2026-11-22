/**
 * RF12: consulta agregados, actualiza al cierre y reconecta solo con la ruta/app en primer plano.
 * La pantalla de resultados no conoce Supabase. El repositorio autoriza la lectura por RPC.
 * Una consulta periódica de respaldo recupera eventos perdidos sin depender de votos individuales.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useSesion } from '@/contexto/SesionContext';
import {
  escucharResultadosEncuesta,
  obtenerResultadosEncuesta,
} from '@/repositorios/resultadosEncuesta';

/** Cierra el canal al salir o bloquear la app; la reconexión vuelve a pedir datos autorizados. */
export function useResultadosEncuesta(id: string) {
  const { perfil } = useSesion();
  const usuarioId = perfil?.id;
  const cliente = useQueryClient();
  const [activa, setActiva] = useState(false);
  const [conectada, setConectada] = useState(false);
  const consulta = useQuery({
    queryKey: ['resultados', usuarioId, id],
    enabled: Boolean(usuarioId && activa),
    queryFn: () => obtenerResultadosEncuesta(id),
    refetchInterval: (estado) => {
      const datos = estado.state.data;
      return activa &&
        (!datos || !datos.permitido || Date.parse(datos.encuesta.cierra_en) > Date.now())
        ? 10_000
        : false;
    },
    refetchIntervalInBackground: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (!usuarioId) return;
      let vigente = true;
      let cancelar: (() => void) | undefined;
      const actualizar = () => {
        if (vigente) void cliente.invalidateQueries({ queryKey: ['resultados', usuarioId, id] });
      };
      const conectar = () => {
        cancelar?.();
        cancelar = undefined;
        setConectada(false);
        const delante = AppState.currentState === 'active';
        setActiva(delante);
        if (delante) {
          actualizar();
          cancelar = escucharResultadosEncuesta(id, actualizar, (valor) => {
            if (vigente) setConectada(valor);
          });
        }
      };
      conectar();
      const listener = AppState.addEventListener('change', conectar);
      return () => {
        vigente = false;
        cancelar?.();
        listener.remove();
        setActiva(false);
        setConectada(false);
      };
    }, [id, usuarioId, cliente]),
  );

  // No hace falta un voto nuevo para publicar resultados reservados: se consulta al llegar el cierre.
  const cierre = consulta.data?.encuesta.cierra_en;
  useEffect(() => {
    if (!activa || !cierre || !usuarioId) return;
    const restante = Date.parse(cierre) - Date.now();
    if (restante <= 0) return;
    const timer = setTimeout(
      () => {
        void cliente.invalidateQueries({ queryKey: ['resultados', usuarioId, id] });
      },
      Math.min(restante + 50, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [activa, cierre, usuarioId, id, cliente]);
  return { consulta, conectada };
}

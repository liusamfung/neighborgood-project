/** RF31: caché por cuenta/rango y recuperación al volver al Panel.
 * El repositorio consulta la vista; reporteMensual completa meses sin filas y valida conteos.
 */
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSesion } from '@/contexto/SesionContext';
import { obtenerReporteMensual } from '@/repositorios/reporteMensual';
import { completarReporte, mesActualLima, mesesReporte } from '@/utilidades/reporteMensual';

/** El temporizador comprueba el calendario local; no consulta datos en segundo plano. */
export function useReporteMensual(cantidad: 6 | 12) {
  const { perfil } = useSesion();
  const [mes, setMes] = useState(() => mesActualLima());
  const meses = mesesReporte(mes, cantidad);
  useEffect(() => {
    const actualizar = () => {
      if (AppState.currentState === 'active') setMes(mesActualLima());
    };
    const timer = setInterval(actualizar, 60_000);
    const listener = AppState.addEventListener('change', actualizar);
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  const consulta = useQuery({
    queryKey: ['reporte-incidencias', perfil?.id, mes, cantidad],
    enabled: perfil?.rol === 'directiva',
    queryFn: async () => completarReporte(meses, await obtenerReporteMensual(meses[0], mes)),
  });
  const { refetch } = consulta;
  useFocusEffect(
    useCallback(() => {
      if (perfil?.rol === 'directiva') void refetch();
    }, [perfil?.rol, refetch]),
  );
  return consulta;
}

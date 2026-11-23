/**
 * Hook del aviso de ingreso: con la app abierta, avisa al residente que su visita ingresó (RF21).
 *
 * Qué hace: mientras el residente tiene sesión, escucha por Realtime los ingresos de sus visitas. Por cada
 * uno muestra "Tu visita ingresó" y marca como vencida la caché `['pases']`, para que "Mis pases" muestre
 * el pase como Usado sin recargar. Con la app cerrada, el aviso llega por push (Edge Function
 * `validar-pase`).
 * Cómo funciona: no consulta nada; abre el canal al montar y lo cierra al desmontar o si cambia el usuario.
 * Se usa con: `src/app/residente/(tabs)/_layout.tsx`, que envuelve todas las pestañas del residente.
 * Depende de: `src/repositorios/avisoDeIngreso.ts`, `useSesion` (`src/contexto/SesionContext.tsx`) y de
 * `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useSesion } from '@/contexto/SesionContext';
import { escucharIngresos } from '@/repositorios/avisoDeIngreso';

/** Escucha los ingresos de las visitas del residente con sesión y los avisa en pantalla. */
export function useAvisoDeIngreso() {
  const { perfil } = useSesion();
  const queryClient = useQueryClient();
  const residenteId = perfil?.id;

  useEffect(() => {
    if (!residenteId) return;
    return escucharIngresos(residenteId, ({ nombreVisitante }) => {
      void queryClient.invalidateQueries({ queryKey: ['pases'] });
      Alert.alert('Tu visita ingresó', `${nombreVisitante} acaba de ingresar al condominio.`);
    });
  }, [residenteId, queryClient]);
}

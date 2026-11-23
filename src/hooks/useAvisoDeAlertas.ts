/**
 * Hook del aviso de alertas: con la app abierta, avisa al instante cada alerta de pánico nueva (RF25).
 *
 * Qué hace: mientras hay sesión, escucha por Realtime las alertas que el usuario puede ver (el personal,
 * todas; un residente, las de su sector). Por cada alerta que no emitió él mismo:
 * - el teléfono vibra y suena (RF24, `avisarAlertaRecibida`);
 * - muestra un aviso con el tipo y la unidad de origen; al personal le ofrece "Ver detalle" para atenderla
 *   (RF27);
 * - marca como vencida la caché `['alertas']`, para que las listas se vuelvan a consultar.
 * Con la app cerrada, el aviso llega por push (Edge Function `notificar-alerta`).
 * Cómo funciona: abre el canal al montar y lo cierra al desmontar o si cambia el usuario. En desarrollo
 * registra cuántos milisegundos tardó la alerta en llegar, como evidencia del promedio de 3 s (RNF1).
 * Se usa con: los layouts de pestañas de los tres roles (`src/app/{residente,guardia,directiva}/(tabs)/_layout.tsx`),
 * que envuelven todas sus pestañas.
 * Depende de: `src/repositorios/difusionAlertas.ts`, `src/repositorios/emitirAlerta.ts` (ubicación),
 * `src/servicios/avisoDeAlerta.ts`, `src/utilidades/alertaEmergencia.ts`, `useSesion` y `QueryClientProvider`.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useSesion } from '@/contexto/SesionContext';
import { escucharAlertasNuevas } from '@/repositorios/difusionAlertas';
import { obtenerUbicacion } from '@/repositorios/emitirAlerta';
import { avisarAlertaRecibida, NOMBRE_ALERTA } from '@/servicios/avisoDeAlerta';
import { textoUbicacion } from '@/utilidades/alertaEmergencia';

/** Escucha las alertas nuevas y las avisa con vibración, sonido y un mensaje en pantalla. */
export function useAvisoDeAlertas() {
  const { perfil } = useSesion();
  const queryClient = useQueryClient();
  const router = useRouter();
  const usuarioId = perfil?.id;
  const rol = perfil?.rol;

  useEffect(() => {
    if (!usuarioId || !rol) return;
    return escucharAlertasNuevas(async (alerta) => {
      // El emisor ya tiene su propia confirmación (pantalla "Alerta enviada" y RF24).
      if (alerta.emisor_id === usuarioId) return;
      if (__DEV__) {
        console.info(`RF25: alerta recibida en ${Date.now() - Date.parse(alerta.creada_en)} ms`);
      }
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      // Si no se puede leer la unidad, se avisa igual, sin la ubicación: la alerta es lo importante.
      const lugar = await obtenerUbicacion(alerta.unidad_id)
        .then(textoUbicacion)
        .catch(() => '');
      void avisarAlertaRecibida(alerta.tipo, lugar || 'Unidad sin datos');
      const titulo = `Alerta ${NOMBRE_ALERTA[alerta.tipo]}`;
      const cuerpo = lugar ? `Se activó en ${lugar}.` : 'Se activó una alerta en el condominio.';
      if (rol === 'residente') {
        Alert.alert(titulo, cuerpo);
        return;
      }
      // Directiva y guardia la atienden desde su detalle (RF27).
      Alert.alert(titulo, cuerpo, [
        { text: 'Después', style: 'cancel' },
        {
          text: 'Ver detalle',
          onPress: () =>
            router.push({
              pathname: rol === 'guardia' ? '/guardia/alerta/[id]' : '/directiva/alerta/[id]',
              params: { id: alerta.id },
            }),
        },
      ]);
    });
  }, [usuarioId, rol, queryClient, router]);
}

/** RF30: aviso dentro de la app del residente y apertura de la lista desde una push.
 * Se monta en su layout; escucha solo sus reportes mediante el repositorio, sin pedir permisos nuevos.
 */
import { useEffect, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { escucharMisIncidencias } from '@/repositorios/incidencias';
import { colores } from '@/tema';

/** Cambiar de cuenta desmonta este componente por su key en el layout. */
export function AvisoIncidencia() {
  const { perfil } = useSesion();
  const router = useRouter();
  const cliente = useQueryClient();
  const [mensaje, setMensaje] = useState('');
  const usuarioId = perfil?.id;
  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    let detener: (() => void) | undefined;
    const vistos = new Set<string>();
    const actualizar = () => {
      if (vigente) void cliente.invalidateQueries({ queryKey: ['incidencias', usuarioId] });
    };
    /** Realtime y push comparten identificador para no duplicar el mismo aviso. */
    const avisar = (dato: { id: string; estado: string; version: string }) => {
      if (
        !vigente ||
        AppState.currentState !== 'active' ||
        !['en_atencion', 'resuelto'].includes(dato.estado)
      )
        return;
      const clave = `${dato.id}:${dato.version}`;
      if (vistos.has(clave)) return;
      vistos.add(clave);
      if (vistos.size > 50) vistos.delete(vistos.values().next().value!);
      actualizar();
      setMensaje(`Tu incidencia está ${dato.estado === 'resuelto' ? 'resuelta' : 'en atención'}.`);
    };
    const conectar = () => {
      detener?.();
      detener = undefined;
      if (AppState.currentState === 'active')
        detener = escucharMisIncidencias(usuarioId, avisar, actualizar);
    };
    conectar();
    const estado = AppState.addEventListener('change', conectar);
    const recibida =
      Platform.OS === 'web'
        ? null
        : Notifications.addNotificationReceivedListener((notificacion) => {
            const dato = notificacion.request.content.data;
            if (
              dato?.tipo === 'incidencia' &&
              dato.usuario_id === usuarioId &&
              typeof dato.id === 'string' &&
              typeof dato.estado === 'string' &&
              typeof dato.version === 'string'
            )
              avisar({ id: dato.id, estado: dato.estado, version: dato.version });
          });
    /** Resuelve el destino solo para la cuenta destinataria; nunca navega a un reporte de otra sesión. */
    let ultimaRespuesta: string | undefined;
    const abrir = (respuesta: Notifications.NotificationResponse | null) => {
      const dato = respuesta?.notification.request.content.data;
      const identificador = respuesta?.notification.request.identifier;
      if (
        vigente &&
        dato?.tipo === 'incidencia' &&
        dato.usuario_id === usuarioId &&
        identificador !== ultimaRespuesta
      ) {
        ultimaRespuesta = identificador;
        actualizar();
        router.push('/residente/incidencias');
        Notifications.clearLastNotificationResponse();
      }
    };
    const respuesta =
      Platform.OS === 'web' ? null : Notifications.addNotificationResponseReceivedListener(abrir);
    if (Platform.OS !== 'web') abrir(Notifications.getLastNotificationResponse());
    return () => {
      vigente = false;
      detener?.();
      estado.remove();
      recibida?.remove();
      respuesta?.remove();
    };
  }, [usuarioId, cliente, router]);
  if (!mensaje) return null;
  return (
    <View style={{ padding: 16, gap: 8, backgroundColor: colores.suave }}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
        {mensaje}
      </Text>
      <Boton
        texto="Ver mis incidencias"
        variante="secundario"
        alPresionar={() => {
          setMensaje('');
          router.push('/residente/incidencias');
        }}
      />
      <Boton texto="Cerrar aviso" variante="secundario" alPresionar={() => setMensaje('')} />
    </View>
  );
}

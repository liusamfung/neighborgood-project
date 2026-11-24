/**
 * Servicio de notificaciones del dispositivo: configuración, permiso y token de Expo Push (issue #7).
 *
 * Qué hace: prepara el teléfono para recibir notificaciones y obtiene el token de Expo Push que identifica
 * este teléfono. Con ese token las Edge Functions (`validar-pase`, `notificar-alerta`, `notificar-incidencia`)
 * pueden avisar al usuario aunque la app esté cerrada.
 * - `configurarNotificaciones`: una sola vez por sesión de la app, fija cómo se muestra una notificación con
 *   la app abierta y crea los canales de Android. Los canales deben existir desde el inicio: una push que
 *   llega con la app cerrada usa el canal que indica el servidor (`alertas`); si la app nunca lo creó,
 *   Android la muestra por un canal común, sin sonido fuerte ni aviso emergente.
 * - `pedirPermisoNotificaciones`: pide el permiso si todavía se puede preguntar (Android 13 o más nuevo y iOS
 *   lo piden; si el usuario ya lo negó, no se insiste).
 * - `obtenerTokenPush`: devuelve el token, o `null` si no se puede (permiso negado, iPhone con cuenta de
 *   Apple gratuita que no tiene push remoto, Android sin Firebase configurado, emulador sin Google Play,
 *   web). Nunca lanza un error: registrar el teléfono es de mejor esfuerzo y no debe romper la app.
 * Cómo funciona: es la capa "servicios del dispositivo" de la arquitectura (RNF7): las pantallas y los hooks
 * la llaman, pero no habla con Supabase. Guarda en memoria el último token obtenido para poder quitarlo de la
 * base al cerrar sesión (`tokenGuardado`).
 * Se usa con: `src/hooks/useRegistroDeDispositivo.ts` (obtiene y registra el token),
 * `src/repositorios/dispositivos.ts` (lo quita al cerrar sesión) y `src/servicios/avisoDeAlerta.ts`
 * (reutiliza la configuración y el permiso para las notificaciones locales de RF24).
 * Depende de: `expo-notifications`, `expo-constants` (lee el `projectId` de EAS de `app.json`),
 * `src/utilidades/notificaciones.ts` (regla de primer plano) y de la configuración de Firebase en Android
 * (`google-services.json`, ver `app.config.js`).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import { debeMostrarEnPrimerPlano } from '@/utilidades/notificaciones';

/** Canal de Android para las alertas; importancia máxima para que suene y se vea encima de todo. */
export const CANAL_ALERTAS = 'alertas';

/** Canal de Android para el resto de las notificaciones (ingreso de visita, estado de una incidencia). */
export const CANAL_GENERAL = 'default';

/**
 * Patrón de vibración en milisegundos: [espera, vibra, pausa, vibra, ...].
 * Tres pulsos largos: se distingue de un mensaje común, que vibra una sola vez.
 */
export const PATRON_VIBRACION = [0, 600, 250, 600, 250, 600];

// Se configura una sola vez por sesión de la app (manejador y canales).
let configurado = false;

// Último token de Expo Push obtenido en esta sesión; se usa para quitarlo de la base al cerrar sesión.
let tokenActual: string | null = null;

/**
 * Prepara las notificaciones la primera vez que se necesitan: el manejador de primer plano y los canales de
 * Android. Es seguro llamarla varias veces: solo actúa la primera.
 */
export async function configurarNotificaciones(): Promise<void> {
  if (configurado || Platform.OS === 'web') return;
  // Sin este manejador, con la app abierta la notificación llega en silencio. Las push cuyo aviso ya llega
  // por Realtime no se muestran para no repetirlas (`debeMostrarEnPrimerPlano`); las locales sí.
  Notifications.setNotificationHandler({
    handleNotification: async (notificacion) => {
      const mostrar = debeMostrarEnPrimerPlano(notificacion.request.content.data);
      return {
        shouldPlaySound: mostrar,
        shouldShowBanner: mostrar,
        shouldShowList: mostrar,
        shouldSetBadge: false,
      };
    },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_ALERTAS, {
      name: 'Alertas de emergencia',
      importance: AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: PATRON_VIBRACION,
      enableVibrate: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(CANAL_GENERAL, {
      name: 'Avisos',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  configurado = true;
}

/**
 * Pide el permiso de notificaciones si todavía se puede preguntar.
 *
 * @returns true si hay permiso para notificar (y por lo tanto para sonar).
 */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  // Solo se pide si todavía se puede preguntar; si el usuario ya lo negó, no se insiste.
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Obtiene el token de Expo Push de este teléfono, pidiendo el permiso si hace falta.
 *
 * @returns el token (por ejemplo `ExponentPushToken[xxxx]`) o `null` si no se pudo obtener. Los motivos más
 * comunes: el usuario negó el permiso, el teléfono no tiene push remoto (iPhone con cuenta de Apple gratuita),
 * la build de Android no trae `google-services.json`, o no hay conexión. Solo avisa en la consola.
 */
export async function obtenerTokenPush(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await configurarNotificaciones();
    if (!(await pedirPermisoNotificaciones())) return null;
    // El `projectId` de EAS está en `app.json` (`extra.eas.projectId`); Expo lo exige para emitir el token.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn(
        'No se encontró el projectId de EAS: no se puede pedir el token de notificaciones',
      );
      return null;
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    tokenActual = data;
    return data;
  } catch (error) {
    console.warn('No se pudo obtener el token de notificaciones', error);
    return null;
  }
}

/**
 * Escucha los cambios del token nativo del teléfono (FCM o APNs) y avisa para que se vuelva a registrar.
 *
 * @param alCambiar se llama cuando el sistema entrega un token nuevo.
 * @returns una función para dejar de escuchar; hay que llamarla al desmontar.
 */
export function escucharCambioDeToken(alCambiar: () => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const suscripcion = Notifications.addPushTokenListener(() => alCambiar());
  return () => suscripcion.remove();
}

/** Último token obtenido en esta sesión, o `null` si no hay (todavía o porque ya se olvidó). */
export function tokenGuardado(): string | null {
  return tokenActual;
}

/** Olvida el token guardado en memoria; se llama al cerrar sesión, después de quitarlo de la base. */
export function olvidarToken(): void {
  tokenActual = null;
}

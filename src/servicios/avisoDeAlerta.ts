/**
 * Aviso físico de una alerta de pánico: vibración y sonido en el teléfono (RF24).
 *
 * Qué hace: hace vibrar y sonar el teléfono en dos momentos del flujo de alertas: cuando el residente
 * confirma su alerta (emisor) y cuando una alerta le llega a otro usuario (receptor). Criterio de
 * aceptación del issue #34: "Cuando el residente confirma la alerta, entonces su teléfono vibra y
 * suena. Cuando la alerta llega a un receptor, su teléfono también vibra y suena."
 * Cómo funciona: no agrega librerías nuevas (no obliga a recompilar la development build).
 * - Vibración: `Vibration` de React Native con un patrón largo, más un golpe de `expo-haptics`, que en
 *   iPhone se siente más fuerte que la vibración simple.
 * - Sonido: una notificación local inmediata de `expo-notifications` con el sonido del sistema. En
 *   Android usa el canal "alertas" de importancia máxima, para que suene aunque la app esté abierta.
 * Si el usuario negó el permiso de notificaciones, igual vibra: la vibración no necesita permiso.
 * Ningún error de este módulo debe impedir que la alerta se envíe: por eso todo va en try/catch.
 * Es la capa "servicios del dispositivo" de la arquitectura (RNF7): las pantallas lo llaman, pero no
 * habla con Supabase.
 * Se usa con: `src/app/residente/alerta/enviada.tsx` (emisor, P3b). El receptor
 * (`avisarAlertaRecibida`) lo llamará la suscripción de Realtime a `alertas` cuando exista (RF25).
 * Depende de: `expo-haptics`, `expo-notifications` y el tipo `tipo_alerta` de la base.
 */
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

import type { Database } from '@/tipos/base_de_datos';

/** Tipo de alerta: viene del enumerado `tipo_alerta` (`medica`, `incendio` o `seguridad`). */
export type TipoAlerta = Database['public']['Enums']['tipo_alerta'];

/** Canal de Android para las alertas; importancia máxima para que suene y se vea encima de todo. */
export const CANAL_ALERTAS = 'alertas';

/**
 * Patrón de vibración en milisegundos: [espera, vibra, pausa, vibra, ...].
 * Tres pulsos largos: se distingue de un mensaje común, que vibra una sola vez.
 */
export const PATRON_VIBRACION = [0, 600, 250, 600, 250, 600];

/** Texto que ve el usuario para cada tipo de alerta. */
export const NOMBRE_ALERTA: Record<TipoAlerta, string> = {
  medica: 'médica',
  incendio: 'de incendio',
  seguridad: 'de seguridad',
};

// Se configura una sola vez por sesión de la app (canal, manejador y permiso).
let configurado = false;

/**
 * Prepara las notificaciones la primera vez que se necesitan: el manejador (para que suenen con la
 * app abierta), el canal de Android y el permiso.
 *
 * @returns true si hay permiso para notificar (y por lo tanto para sonar).
 */
async function prepararNotificaciones(): Promise<boolean> {
  if (!configurado) {
    // Sin este manejador, con la app abierta la notificación llega en silencio.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldSetBadge: false,
      }),
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
    }
    configurado = true;
  }
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  // Solo se pide si todavía se puede preguntar; si el usuario ya lo negó, no se insiste.
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Vibra con el patrón de alerta y da un golpe háptico fuerte.
 * No necesita permisos: funciona aunque se haya negado el de notificaciones.
 */
function vibrar(): void {
  Vibration.vibrate(PATRON_VIBRACION);
  // El háptico es un refuerzo: si el teléfono no lo soporta, basta con la vibración.
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/**
 * Lanza ya una notificación local con sonido.
 *
 * @param titulo y cuerpo: lo que muestra la notificación.
 */
async function sonar(titulo: string, cuerpo: string): Promise<void> {
  const conPermiso = await prepararNotificaciones();
  if (!conPermiso) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: 'default' },
    // Inmediata; en Android, por el canal de alertas para que use su sonido e importancia.
    trigger: Platform.OS === 'android' ? { channelId: CANAL_ALERTAS } : null,
  });
}

/**
 * Emisor (RF24): el residente acaba de confirmar su alerta. Su teléfono vibra y suena para confirmarle
 * que se envió.
 *
 * @param tipo tipo de la alerta enviada.
 */
export async function avisarAlertaEnviada(tipo: TipoAlerta): Promise<void> {
  vibrar();
  try {
    await sonar(
      `Alerta ${NOMBRE_ALERTA[tipo]} enviada`,
      'El personal de seguridad y tus vecinos ya fueron avisados.',
    );
  } catch (error) {
    console.warn('No se pudo reproducir el sonido de la alerta', error);
  }
}

/**
 * Receptor (RF24): llegó una alerta de otro usuario. El teléfono vibra y suena para llamar la atención.
 *
 * @param tipo tipo de la alerta recibida.
 * @param lugar texto corto de dónde ocurre, por ejemplo "Torre A · 302".
 */
export async function avisarAlertaRecibida(tipo: TipoAlerta, lugar: string): Promise<void> {
  vibrar();
  try {
    await sonar(`🚨 Alerta ${NOMBRE_ALERTA[tipo]}`, `${lugar}. Toca para ver el detalle.`);
  } catch (error) {
    console.warn('No se pudo reproducir el sonido de la alerta', error);
  }
}

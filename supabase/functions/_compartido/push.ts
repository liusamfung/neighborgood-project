/**
 * Envío de notificaciones push con Expo Push Service.
 *
 * Qué hace: manda un mismo mensaje a varios tokens de Expo (los de la tabla `dispositivos`). Expo lo
 * reenvía a FCM (Android) o APNs (iOS).
 * Cómo funciona: es "mejor esfuerzo": si no hay tokens o Expo falla, lo registra y devuelve `false`,
 * pero nunca lanza un error, para que una notificación fallida no deshaga la operación principal (por
 * ejemplo, el ingreso de una visita ya registrado).
 * Se usa con: `validar-pase/manejador.ts` (RF21). La usarán las alertas (RF25) en el Sprint 5.
 * Depende de: el secreto opcional `EXPO_ACCESS_TOKEN` (`supabase secrets set EXPO_ACCESS_TOKEN=...`),
 * necesario solo si el proyecto de Expo exige "push security".
 */

/** Dirección del servicio de push de Expo. */
const URL_EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

/** Contenido de una notificación. */
export type MensajePush = {
  titulo: string
  cuerpo: string
  /** Datos extra que recibe la app al tocar la notificación (por ejemplo, el id del pase). */
  datos?: Record<string, unknown>
}

/**
 * Envía una notificación a una lista de tokens de Expo.
 *
 * @param tokens valores de `dispositivos.expo_push_token`.
 * @param mensaje título, cuerpo y datos.
 * @param pedir función `fetch` a usar; las pruebas pasan una falsa para no salir a la red.
 * @returns `true` si Expo aceptó el envío; `false` si no había tokens o falló.
 */
export async function enviarPush(
  tokens: string[],
  mensaje: MensajePush,
  pedir: typeof fetch = fetch,
): Promise<boolean> {
  if (tokens.length === 0) return false
  const token = Deno.env.get('EXPO_ACCESS_TOKEN')
  try {
    const respuesta = await pedir(URL_EXPO_PUSH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Expo acepta un arreglo de mensajes: uno por token, con el mismo contenido.
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: mensaje.titulo,
          body: mensaje.cuerpo,
          data: mensaje.datos ?? {},
          sound: 'default',
        })),
      ),
    })
    if (!respuesta.ok) console.error('Expo Push respondió con estado', respuesta.status)
    return respuesta.ok
  } catch (error) {
    console.error('No se pudo enviar la notificación push', (error as Error).message)
    return false
  }
}

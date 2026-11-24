/**
 * Reglas puras de las notificaciones push (issue #7): qué hacer con una push que llega con la app abierta.
 *
 * Qué hace: decide si una notificación remota debe mostrarse como banner (y sonar) cuando la app está en
 * primer plano. Las push de alertas, de incidencias y de ingreso de visitas ya tienen su propio aviso dentro
 * de la app, que llega por Realtime (`useAvisoDeAlertas`, `AvisoIncidencia`, `useAvisoDeIngreso`). Si
 * además se mostrara el banner de la push, el usuario vería el mismo aviso dos veces.
 * Cómo funciona: las Edge Functions marcan cada push con `data.tipo` (`alerta`, `incidencia` o
 * `ingreso_visita`). Las notificaciones locales que crea la propia app (vibración y sonido de RF24) no llevan
 * `tipo`, así que se siguen mostrando. Con la app cerrada o en segundo plano esta regla no se usa: el
 * sistema muestra la push él mismo.
 * Se usa con: `src/servicios/notificaciones.ts` (manejador de primer plano). No importa nada de React Native
 * para poder probarse con `node:test` (`herramientas/pruebas/notificaciones.test.cjs`).
 * Depende de: los valores de `datos.tipo` que mandan `supabase/functions/validar-pase`,
 * `notificar-alerta` y `notificar-incidencia`.
 */

/** Valores de `data.tipo` cuyo aviso ya llega a la app abierta por Realtime. */
export const TIPOS_CON_AVISO_PROPIO = ['alerta', 'incidencia', 'ingreso_visita'] as const;

/**
 * Indica si una notificación debe mostrarse (banner y sonido) con la app en primer plano.
 *
 * @param datos el `data` de la notificación (lo que mandó la Edge Function); puede faltar.
 * @returns `false` si es una push cuyo aviso ya se muestra por Realtime; `true` en cualquier otro caso
 * (notificación local, tipo desconocido o sin datos).
 */
export function debeMostrarEnPrimerPlano(datos: unknown): boolean {
  if (!datos || typeof datos !== 'object' || !('tipo' in datos)) return true;
  const tipo = (datos as { tipo: unknown }).tipo;
  return !(TIPOS_CON_AVISO_PROPIO as readonly unknown[]).includes(tipo);
}

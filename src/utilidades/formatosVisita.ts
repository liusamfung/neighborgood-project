/**
 * Formatos de la garita: la hora exacta de ingreso o salida de una visita (RF19, RF20).
 *
 * Qué hace: convierte un instante que guarda la base (`timestamptz`, ISO 8601) en la hora legible en
 * español de Perú ("6:42 p. m."). Es una función pura.
 * Por qué no está en `formatosPase.ts`: ahí las horas son la hora estimada (`time`, sin día ni zona); aquí
 * son instantes reales que se muestran en la hora del teléfono del guardia, que está en Lima.
 * Se usa con: `src/componentes/visitas/ResultadoEscaneo.tsx` y `src/componentes/visitas/TarjetaVisita.tsx`.
 */

/**
 * Hora de un instante, por ejemplo "6:42 p. m.".
 *
 * @param instante fecha y hora ISO 8601, como `ingreso_en` o `salida_en`.
 */
export function formatearInstante(instante: string): string {
  return new Date(instante).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
}

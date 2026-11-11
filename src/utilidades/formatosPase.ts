/**
 * Formatos para mostrar un pase: la fecha y la hora de la visita como las lee el residente.
 *
 * Qué hace: convierte los textos que guarda la base (`2026-11-10` y `18:30:00`) en texto legible en
 * español de Perú ("mar, 10 nov" y "6:30 p. m."). Son funciones puras.
 * Se usa con: `src/componentes/visitas/TarjetaPase.tsx`. Lo usarán también el QR y el pase compartido
 * (RF16, RF17).
 */

/**
 * Fecha de la visita en texto corto, por ejemplo "mar, 10 nov".
 *
 * @param fechaIso fecha `YYYY-MM-DD` tal como la guarda la columna `date`.
 */
export function formatearFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  // Se arma con año, mes y día locales: `new Date('2026-11-10')` se leería en UTC y podría mostrar el día anterior.
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Hora estimada en texto de 12 horas, por ejemplo "6:30 p. m.".
 *
 * @param hora hora `HH:MM` o `HH:MM:SS` tal como la guarda la columna `time`, o `null` si no hay.
 * @returns el texto, o `"Sin hora"` cuando el pase no tiene hora estimada.
 */
export function formatearHora(hora: string | null): string {
  if (!hora) return 'Sin hora';
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(2000, 0, 1, horas, minutos).toLocaleTimeString('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

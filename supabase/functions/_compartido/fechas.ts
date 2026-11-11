/**
 * Fechas y horas de las Edge Functions, siempre en la zona horaria del condominio (`America/Lima`).
 *
 * Qué hace: calcula "hoy" en Lima y comprueba que un texto sea una fecha (`YYYY-MM-DD`) o una hora
 * (`HH:MM`) real. Son funciones puras: no leen la base de datos.
 * Por qué existe: el servidor corre en UTC, así que `new Date()` puede ser "mañana" para el residente.
 * El pase vale solo el día de la visita, hasta las 23:59 de Lima (RNF3), y quien decide qué día es hoy
 * es el servidor, no el teléfono. Es el equivalente en TypeScript de `privado.hoy_lima()` de la base.
 * Se usa con: `crear-pase/manejador.ts` (la fecha de la visita no puede ser anterior a hoy) y lo usará
 * la validación del pase al escanear (RF18).
 */

/** Zona horaria del condominio; la misma que usa `privado.hoy_lima()` en la migración 3. */
const ZONA_LIMA = 'America/Lima'

// "en-CA" escribe la fecha como YYYY-MM-DD, que es justo el formato de la columna `date` de Postgres.
const formatoLima = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_LIMA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Día de hoy en Lima.
 *
 * @param ahora momento de referencia; se puede pasar para probar sin depender del reloj.
 * @returns la fecha como `YYYY-MM-DD`. Dos fechas así se comparan bien como texto (`<`, `>`).
 */
export function hoyLima(ahora: Date = new Date()): string {
  return formatoLima.format(ahora)
}

/**
 * Comprueba que el valor sea una fecha de calendario real con el formato `YYYY-MM-DD`.
 * Rechaza formatos distintos y días que no existen, como `2026-02-30`.
 */
export function esFechaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  // Date.UTC "desborda" los días imposibles (30 de febrero pasa a marzo): si al volver a leer la
  // fecha cambió, el día original no existía.
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  )
}

/** Comprueba que el valor sea una hora de 24 horas con el formato `HH:MM` (de `00:00` a `23:59`). */
export function esHoraValida(valor: unknown): valor is string {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

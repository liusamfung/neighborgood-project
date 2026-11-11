/**
 * Fechas en la zona horaria del condominio (America/Lima) para las Edge Functions.
 *
 * Qué hace: calcula "hoy" como texto "AAAA-MM-DD" en Lima. Los pases de visita valen solo el día de la
 * visita hasta las 23:59 de Lima (regla 3 de CLAUDE.md, RNF3), y el servidor corre en UTC, así que
 * no sirve `new Date()` a secas.
 * Se usa con: `crear-pase/manejador.ts` (no aceptar fechas pasadas) y `validar-pase/manejador.ts`
 * (el pase solo vale hoy). Es el equivalente de `privado.hoy_lima()` de la base de datos.
 */

/**
 * Día en Lima de un instante dado.
 *
 * @param instante momento a convertir; por defecto, ahora. Las pruebas pasan uno fijo.
 * @returns el día "AAAA-MM-DD" (el formato `en-CA` coincide con el de una columna `date`).
 */
export function hoyEnLima(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(instante)
}

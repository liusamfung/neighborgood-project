/**
 * Utilidades de fechas para mostrar en pantalla y para los pases de visita.
 *
 * Qué hace: da formato en español a las fechas que llegan de Supabase y calcula "hoy" en la zona
 * `America/Lima`, que es la que decide si un pase de visita sigue vigente (regla 3 de CLAUDE.md).
 * Se usa con: las tarjetas de avisos y encuestas, la pantalla de Visitas (P6) y la del guardia (P11).
 * No depende de otros archivos del proyecto.
 */

/** Fecha y hora cortas, por ejemplo "10 nov 2026, 08:30 p. m.". */
export function fechaYHora(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Solo la hora, por ejemplo "08:30 p. m.". */
export function soloHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Día de una columna `date` de Postgres ("2026-11-10") como "10 nov 2026".
 * Se arma con los números del texto para que la zona horaria del teléfono no lo corra un día.
 */
export function diaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Hora de una columna `time` de Postgres ("18:30:00") como "18:30". */
export function horaLegible(hora: string): string {
  return hora.slice(0, 5);
}

/**
 * Convierte un `Date` al día "AAAA-MM-DD" en la zona `America/Lima`.
 * El formato `en-CA` escribe las fechas justo como las espera una columna `date`.
 */
export function diaEnLima(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(fecha);
}

/** El día de hoy en Lima, "AAAA-MM-DD" (igual que `privado.hoy_lima()` en la base). */
export function hoyEnLima(): string {
  return diaEnLima(new Date());
}

/** Hora "HH:MM" de un `Date` en la zona `America/Lima`, para la columna `hora_estimada`. */
export function horaEnLima(fecha: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

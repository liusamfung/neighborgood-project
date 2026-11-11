/**
 * Borrador de pase: cómo se crea uno nuevo, cómo se valida y cómo se convierte para enviarlo (RF15).
 *
 * Qué hace: arma el borrador inicial de la pantalla P6 (sin nombre, llegada dentro de una hora), revisa que
 * esté completo para mostrar los errores en español antes de llamar al servidor, y convierte la llegada al
 * formato que espera la Edge Function `crear-pase` (`YYYY-MM-DD` y `HH:MM`). Son funciones puras.
 * Cómo funciona: el servidor sigue siendo la autoridad (la función repite estas reglas con la fecha de
 * "hoy" en Lima); aquí solo se evita un viaje de ida y vuelta con un error evidente.
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx` y `src/repositorios/pases.ts` (`aFechaIso`, `aHora`).
 * Depende de: `src/tipos/pase.ts`.
 */
import type { BorradorPase } from '@/tipos/pase';

/** Largo máximo del nombre del invitado; es el mismo límite de la Edge Function. */
const MAXIMO_NOMBRE = 100;

/** Milisegundos que dura una hora; se usa para proponer la llegada una hora después de ahora. */
const UNA_HORA = 60 * 60 * 1000;

/** Número con dos cifras: 5 → "05". */
const dosCifras = (n: number) => String(n).padStart(2, '0');

/**
 * Fecha como `YYYY-MM-DD` usando el calendario del teléfono (no UTC), que es el día que el residente eligió.
 */
export function aFechaIso(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

/** Hora como `HH:MM` de 24 horas, usando el reloj del teléfono. */
export function aHora(fecha: Date): string {
  return `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
}

/**
 * Borrador inicial de la pantalla: sin nombre y con la llegada dentro de una hora.
 *
 * @param ahora momento de referencia; se puede pasar para no depender del reloj (por defecto, ahora).
 */
export function nuevoBorrador(ahora: Date = new Date()): BorradorPase {
  return { nombre: '', llegada: new Date(ahora.getTime() + UNA_HORA) };
}

/** Errores del borrador, cada uno ya en español y listo para mostrarse junto a su campo. */
export type ErroresBorrador = {
  nombre?: string;
  llegada?: string;
};

/**
 * Revisa el borrador (reglas de RF15).
 *
 * @param borrador lo que llenó el residente.
 * @param ahora momento de referencia para saber qué día es hoy; se puede pasar en pruebas.
 * @returns los errores encontrados y `valido`, que es true solo si no hay ninguno.
 */
export function validarBorrador(
  borrador: BorradorPase,
  ahora: Date = new Date(),
): { errores: ErroresBorrador; valido: boolean } {
  const errores: ErroresBorrador = {};
  const nombre = borrador.nombre.trim();

  if (nombre === '') errores.nombre = 'Escribe el nombre del invitado.';
  else if (nombre.length > MAXIMO_NOMBRE) {
    errores.nombre = `El nombre es muy largo (máximo ${MAXIMO_NOMBRE} letras).`;
  }
  // Las fechas YYYY-MM-DD se comparan como texto. Hoy sí se admite: el pase vale hasta las 11:59 p. m.
  if (aFechaIso(borrador.llegada) < aFechaIso(ahora)) {
    errores.llegada = 'La fecha de la visita no puede ser anterior a hoy.';
  }

  return { errores, valido: Object.keys(errores).length === 0 };
}

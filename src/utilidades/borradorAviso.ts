/**
 * Borrador de aviso: cómo se crea uno nuevo y cómo se valida antes de enviarlo (RF7).
 *
 * Qué hace: arma el borrador inicial de la pantalla P13 (vigente desde ahora durante 7 días, para todo el
 * condominio, sin imagen) y revisa que esté completo, para mostrar los errores en español antes de llamar
 * a la base. Son funciones puras: no usan React ni Supabase.
 * Cómo funciona: la base de datos sigue siendo la garantía final (la función `crear_aviso` y el CHECK de
 * vigencia repiten estas reglas); aquí solo se evita un viaje de ida y vuelta con un error evidente.
 * Se usa con: `src/app/directiva/avisos/nuevo.tsx`.
 * Depende de: `src/tipos/aviso.ts`.
 */
import type { BorradorAviso } from '@/tipos/aviso';

/** Milisegundos que dura un día; se usa para proponer el fin de la vigencia 7 días después del inicio. */
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Borrador inicial de la pantalla: sin título, para todo el condominio, vigente desde ahora por 7 días.
 *
 * @param ahora momento de referencia; se puede pasar para no depender del reloj (por defecto, ahora).
 */
export function nuevoBorrador(ahora: Date = new Date()): BorradorAviso {
  return {
    titulo: '',
    descripcion: '',
    categoriaId: null,
    sectorIds: [],
    vigenteDesde: ahora,
    vigenteHasta: new Date(ahora.getTime() + 7 * UN_DIA),
    imagen: null,
  };
}

/** Errores del borrador, cada uno ya en español y listo para mostrarse junto a su campo. */
export type ErroresBorrador = {
  titulo?: string;
  descripcion?: string;
  categoria?: string;
  vigencia?: string;
};

/**
 * Revisa el borrador completo (reglas de RF7).
 *
 * @returns los errores encontrados y `valido`, que es true solo si no hay ninguno.
 */
export function validarBorrador(borrador: BorradorAviso): {
  errores: ErroresBorrador;
  valido: boolean;
} {
  const errores: ErroresBorrador = {};

  if (borrador.titulo.trim() === '') errores.titulo = 'Escribe el título del aviso.';
  if (borrador.descripcion.trim() === '') errores.descripcion = 'Escribe el mensaje del aviso.';
  if (borrador.categoriaId === null) errores.categoria = 'Elige una categoría.';
  // Misma regla que el CHECK ck_avisos_vigencia_valida: la vigencia termina después de empezar.
  if (borrador.vigenteHasta.getTime() <= borrador.vigenteDesde.getTime()) {
    errores.vigencia = 'La fecha de fin debe ser posterior a la de inicio.';
  }

  return { errores, valido: Object.keys(errores).length === 0 };
}

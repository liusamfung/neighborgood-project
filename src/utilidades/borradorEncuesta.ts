/**
 * Borrador de encuesta: cómo se crea uno nuevo y cómo se valida antes de enviarlo (RF8).
 *
 * Qué hace: arma el borrador inicial de la pantalla P14 (una pregunta con dos opciones, abre ahora y
 * cierra en 7 días) y revisa que esté completo, para mostrar los errores en español antes de llamar a
 * la base. Son funciones puras: no usan React ni Supabase.
 * Cómo funciona: la base de datos sigue siendo la garantía final (la función `crear_encuesta` y el CHECK
 * de fechas repiten estas reglas); aquí solo se evita un viaje de ida y vuelta con un error evidente.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx` y `src/componentes/encuestas/TarjetaPregunta.tsx`.
 * Depende de: `src/tipos/encuesta.ts`.
 */
import type { BorradorEncuesta, BorradorOpcion, BorradorPregunta } from '@/tipos/encuesta';

// Contador para dar una clave única a cada pregunta y opción. Solo sirve para que React distinga los
// elementos de las listas al agregar o quitar; nunca se envía a la base.
let contador = 0;
const nuevaClave = () => `k${++contador}`;

/** Opción vacía lista para escribir. */
export function nuevaOpcion(): BorradorOpcion {
  return { clave: nuevaClave(), texto: '' };
}

/** Pregunta vacía de selección única con dos opciones (el mínimo que acepta la base de datos). */
export function nuevaPregunta(): BorradorPregunta {
  return {
    clave: nuevaClave(),
    texto: '',
    seleccion: 'unica',
    opciones: [nuevaOpcion(), nuevaOpcion()],
  };
}

/** Milisegundos que dura un día; se usa para proponer el cierre 7 días después de la apertura. */
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Borrador inicial de la pantalla: sin título, para todo el condominio, abre ahora y cierra en 7 días.
 *
 * @param ahora momento de referencia; se puede pasar para no depender del reloj (por defecto, ahora).
 */
export function nuevoBorrador(ahora: Date = new Date()): BorradorEncuesta {
  return {
    titulo: '',
    descripcion: '',
    categoriaId: null,
    sectorIds: [],
    obligatoria: false,
    resultadosEnVivo: false,
    abreEn: ahora,
    cierraEn: new Date(ahora.getTime() + 7 * UN_DIA),
    preguntas: [nuevaPregunta()],
  };
}

/** Errores del borrador, cada uno ya en español y listo para mostrarse junto a su campo. */
export type ErroresBorrador = {
  titulo?: string;
  categoria?: string;
  fechas?: string;
  /** Errores por pregunta, indexados por la `clave` de la pregunta. */
  preguntas: Record<string, { texto?: string; opciones?: string }>;
};

/** Opciones con texto: las vacías se descartan al enviar, así que no cuentan. */
export function opcionesConTexto(pregunta: BorradorPregunta): string[] {
  return pregunta.opciones.map((o) => o.texto.trim()).filter((texto) => texto !== '');
}

/**
 * Revisa el borrador completo (reglas de RF8).
 *
 * @returns los errores encontrados y `valido`, que es true solo si no hay ninguno.
 */
export function validarBorrador(borrador: BorradorEncuesta): {
  errores: ErroresBorrador;
  valido: boolean;
} {
  const errores: ErroresBorrador = { preguntas: {} };

  if (borrador.titulo.trim() === '') errores.titulo = 'Escribe el título de la encuesta.';
  if (borrador.categoriaId === null) errores.categoria = 'Elige una categoría.';
  // Misma regla que el CHECK ck_encuestas_cierre_posterior: el cierre debe ser después de la apertura.
  if (borrador.cierraEn.getTime() <= borrador.abreEn.getTime()) {
    errores.fechas = 'La fecha de cierre debe ser posterior a la de apertura.';
  }

  for (const pregunta of borrador.preguntas) {
    const error: { texto?: string; opciones?: string } = {};
    if (pregunta.texto.trim() === '') error.texto = 'Escribe la pregunta.';
    if (opcionesConTexto(pregunta).length < 2) error.opciones = 'Agrega al menos 2 opciones.';
    if (error.texto || error.opciones) errores.preguntas[pregunta.clave] = error;
  }

  const valido =
    !errores.titulo &&
    !errores.categoria &&
    !errores.fechas &&
    Object.keys(errores.preguntas).length === 0;
  return { errores, valido };
}

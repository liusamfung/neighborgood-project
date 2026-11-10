/**
 * Medidas del sistema de diseño: radios de esquina, márgenes y tamaños táctiles.
 *
 * Se usa con: los componentes de `src/componentes` (Boton, CampoTexto, PantallaMarcador) y las
 * pantallas, que las importan desde '@/tema'. Los valores salen de docs/design/DISENO.md.
 */
/** Radios de las esquinas (px): campos y botones 12, tarjetas 16 y chips totalmente redondos. */
export const radios = {
  campo: 12,
  boton: 12,
  tarjeta: 16,
  chip: 999,
} as const;

/** Márgenes y separaciones estándar entre elementos de una pantalla. */
export const espacios = {
  margenLateral: 20,
  entreTarjetas: 12,
} as const;

/** Alturas mínimas pensadas para dedos y adultos mayores (RNF8). */
export const tamanos = {
  /** Los botones principales miden de 52 a 56 px de alto. */
  alturaBotonMin: 52,
  alturaBoton: 56,
  areaTactilMinima: 44,
} as const;

/**
 * Tipos de los catálogos: categorías y sectores, las dos listas que comparten avisos y encuestas.
 *
 * Qué hace: da nombres cortos a las filas de `categorias_aviso` y `sectores`. No contiene lógica.
 * Se usa con: `src/repositorios/catalogos.ts` (los devuelve) y, a través de `src/hooks/useCatalogos.ts`,
 * las pantallas de crear encuesta y crear aviso.
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Tables } from '@/tipos/base_de_datos';

/** Fila de `categorias_aviso`: la categoría de un aviso o de una encuesta (RF10). */
export type Categoria = Tables<'categorias_aviso'>;

/** Fila de `sectores`: una torre, pabellón o manzana a la que se puede dirigir un aviso o una encuesta (RF13). */
export type Sector = Tables<'sectores'>;

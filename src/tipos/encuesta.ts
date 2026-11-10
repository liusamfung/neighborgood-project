/**
 * Tipos de las encuestas: catálogos (categorías y sectores) y el borrador que llena la directiva.
 *
 * Qué hace: da nombres cortos a los tipos de Supabase y define el borrador de P14 (lo que se edita en
 * pantalla antes de publicar). No contiene lógica.
 * Se usa con: `src/utilidades/borradorEncuesta.ts` (crea y valida borradores), `src/repositorios/catalogos.ts`
 * y `src/repositorios/encuestas.ts` (lo envían a Supabase), los hooks de `src/hooks/` y la pantalla
 * `src/app/directiva/encuestas/nueva.tsx` con sus componentes.
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Database, Tables } from '@/tipos/base_de_datos';

/** Fila de `categorias_aviso`: la categoría de un aviso o de una encuesta (RF10). */
export type Categoria = Tables<'categorias_aviso'>;

/** Fila de `sectores`: una torre, pabellón o manzana a la que se puede dirigir una encuesta (RF13). */
export type Sector = Tables<'sectores'>;

/** Tipo de pregunta: viene del enumerado `tipo_seleccion` (`unica` o `multiple`). */
export type TipoSeleccion = Database['public']['Enums']['tipo_seleccion'];

/** Opción de respuesta del borrador. `clave` solo sirve para dibujar la lista; no se guarda. */
export type BorradorOpcion = { clave: string; texto: string };

/** Pregunta del borrador. `clave` solo sirve para dibujar la lista; no se guarda. */
export type BorradorPregunta = {
  clave: string;
  texto: string;
  seleccion: TipoSeleccion;
  opciones: BorradorOpcion[];
};

/** Lo que la directiva llena en la pantalla P14 antes de publicar la encuesta. */
export type BorradorEncuesta = {
  titulo: string;
  descripcion: string;
  /** `null` mientras no elige una categoría. */
  categoriaId: string | null;
  /** Sectores destino (RF13). Vacío = todo el condominio. */
  sectorIds: string[];
  /** true = prioridad alta, la encuesta es obligatoria para el residente (RF14). */
  obligatoria: boolean;
  /** true = los residentes ven los resultados mientras la encuesta está abierta (RF12). */
  resultadosEnVivo: boolean;
  abreEn: Date;
  cierraEn: Date;
  preguntas: BorradorPregunta[];
};

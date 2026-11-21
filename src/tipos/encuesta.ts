/**
 * Tipos de las encuestas: el borrador que llena la directiva en la pantalla P14.
 *
 * Qué hace: define el borrador (lo que se edita en pantalla antes de publicar) y los tipos de pregunta.
 * No contiene lógica. Las categorías y los sectores están en `src/tipos/catalogos.ts`.
 * Se usa con: `src/utilidades/borradorEncuesta.ts` (crea y valida borradores), `src/repositorios/encuestas.ts`
 * (lo envía a Supabase), `src/hooks/useCrearEncuesta.ts` y la pantalla
 * `src/app/directiva/encuestas/nueva.tsx` con sus componentes.
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Database } from '@/tipos/base_de_datos';

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

/** Prioridad de una encuesta: `alta` = obligatoria (RF14), `normal` = opcional. */
export type PrioridadEncuesta = Database['public']['Enums']['prioridad_encuesta'];

/** Fila de la lista de encuestas abiertas que ve el residente en la pantalla P4 (RF11, RF14). */
export type EncuestaListada = {
  id: string;
  titulo: string;
  descripcion: string | null;
  /** `alta` se muestra con la insignia "Obligatoria" (RF14). */
  prioridad: PrioridadEncuesta;
  abre_en: string;
  cierra_en: string;
  /** Nombre de la categoría, resuelto por la relación `categorias_aviso`. */
  categoria: { id: string; nombre: string } | null;
};

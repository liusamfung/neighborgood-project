/**
 * Repositorio de catálogos: las listas de categorías y de sectores que usan avisos y encuestas.
 *
 * Qué hace: lee `categorias_aviso` (RF10) y `sectores` (RF13) para llenar los selectores de los
 * formularios de la directiva. Las pantallas no hablan con Supabase directamente (RNF7).
 * Cómo funciona: las políticas RLS dejan leer ambas tablas a cualquier usuario activo; solo la
 * directiva puede escribirlas.
 * Se usa con: `src/hooks/useCatalogos.ts` (las pone en caché) y, a través de él, la pantalla
 * `src/app/directiva/encuestas/nueva.tsx` (y más adelante la de avisos, RF7).
 * Depende de: `src/lib/supabase.ts` y `src/tipos/encuesta.ts`.
 */
import { supabase } from '@/lib/supabase';
import type { Categoria, Sector } from '@/tipos/encuesta';

/** Categorías de avisos y encuestas, ordenadas por nombre. Lanza el error de Supabase si falla. */
export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias_aviso')
    .select('id, nombre')
    .order('nombre');
  if (error) throw error;
  return data;
}

/** Sectores del condominio (torres, pabellones, manzanas), ordenados por nombre. */
export async function listarSectores(): Promise<Sector[]> {
  const { data, error } = await supabase
    .from('sectores')
    .select('id, nombre, tipo')
    .order('nombre');
  if (error) throw error;
  return data;
}

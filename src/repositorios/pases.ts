/**
 * Repositorio de pases de visita: crear un pase y listar los del residente (RF15).
 *
 * Qué hace: para crear, llama a la Edge Function `crear-pase`; para listar, lee `pases_visita`. Las
 * pantallas no hablan con Supabase directamente (RNF7).
 * Cómo funciona: el residente no puede insertar en `pases_visita` (migración 5): solo la Edge Function lo
 * hace, con la service_role, y deduce el residente y la unidad del token, no de lo que envía la app. Para
 * leer, RLS ya limita la tabla a los pases del residente que pregunta.
 * Se usa con: `src/hooks/useCrearPase.ts` y `src/hooks/useMisPases.ts`.
 * Depende de: `src/repositorios/funciones.ts` (`invocarFuncion`), `src/lib/supabase.ts`,
 * `src/utilidades/borradorPase.ts` y de la función `supabase/functions/crear-pase`.
 */
import { supabase } from '@/lib/supabase';
import { invocarFuncion } from '@/repositorios/funciones';
import type { BorradorPase, Pase } from '@/tipos/pase';
import { aFechaIso, aHora } from '@/utilidades/borradorPase';

/** Columnas de `pases_visita` que se piden; deben coincidir con el tipo `Pase`. */
const COLUMNAS = 'id, nombre_visitante, fecha_visita, hora_estimada, estado, creado_en';

/**
 * Crea un pase vigente para el residente con sesión.
 *
 * @param borrador lo que llenó el residente: nombre y llegada (día y hora).
 * @returns el pase creado, con el código (`id`) que generó Postgres. Lanza un `ErrorFuncion` con el
 * mensaje en español si el servidor lo rechaza (fecha pasada, sin permiso, sin conexión...).
 */
export function crearPase(borrador: BorradorPase): Promise<Pase> {
  return invocarFuncion<Pase>('crear-pase', {
    nombre_visitante: borrador.nombre.trim(),
    fecha_visita: aFechaIso(borrador.llegada),
    hora_estimada: aHora(borrador.llegada),
  });
}

/**
 * Pases del residente, los más recientes primero (hasta 30). Lanza el error de Supabase si falla.
 */
export async function listarMisPases(): Promise<Pase[]> {
  const { data, error } = await supabase
    .from('pases_visita')
    .select(COLUMNAS)
    .order('fecha_visita', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

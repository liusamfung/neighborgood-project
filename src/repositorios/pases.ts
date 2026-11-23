/**
 * Repositorio de pases de visita: crear un pase y listar los del residente (RF15) y anular un pase
 * vigente (RF22).
 *
 * Qué hace: para crear, llama a la Edge Function `crear-pase`; para listar, lee `pases_visita`. Las
 * pantallas no hablan con Supabase directamente (RNF7).
 * Cómo funciona: el residente no puede insertar en `pases_visita` (migración 5): solo la Edge Function lo
 * hace, con la service_role, y deduce el residente y la unidad del token, no de lo que envía la app. Para
 * leer, RLS ya limita la tabla a los pases del residente que pregunta.
 * Se usa con: `src/hooks/useCrearPase.ts`, `src/hooks/useMisPases.ts` y `src/hooks/useAnularPase.ts`.
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

/** Error propio: el pase ya no está vigente (alguien lo usó o ya se había anulado). */
export class PaseNoVigenteError extends Error {
  constructor() {
    super('El pase ya no está vigente');
    this.name = 'PaseNoVigenteError';
  }
}

/**
 * Anula un pase vigente del residente (RF22).
 *
 * Cómo funciona: cambia el estado a `anulado` directamente en `pases_visita`. La base decide si se puede:
 * la política RLS "pases_visita: el residente anula el suyo" (migración 5) solo deja tocar pases propios
 * que sigan vigentes, y el trigger `proteger_pase` (migración 3) guarda la hora en `anulado_en` e impide
 * cambiar un pase usado o anulado. El filtro `estado = 'vigente'` evita anular un pase que el guardia
 * acaba de validar.
 *
 * @param paseId id del pase (el mismo código que lleva el QR).
 * @throws PaseNoVigenteError si el pase ya no estaba vigente; el error de Supabase si falla la consulta.
 */
export async function anularPase(paseId: string): Promise<void> {
  const { data, error } = await supabase
    .from('pases_visita')
    .update({ estado: 'anulado' })
    .eq('id', paseId)
    .eq('estado', 'vigente')
    .select('id');
  if (error) throw error;
  // Sin filas actualizadas: el pase ya no estaba vigente (o RLS no dejó tocarlo).
  if (data.length === 0) throw new PaseNoVigenteError();
}

/**
 * Traduce un error de `anularPase` a un texto en español para el residente.
 *
 * @param error lo que lanzó `anularPase`.
 */
export function mensajeDeErrorAnular(error: unknown): string {
  if (error instanceof PaseNoVigenteError) {
    return 'Este pase ya fue usado o anulado; no se puede anular.';
  }
  return 'No pudimos anular el pase. Revisa tu conexión e inténtalo de nuevo.';
}

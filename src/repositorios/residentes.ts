/**
 * Repositorio de residentes: alta y baja de residentes por la directiva (RF5).
 *
 * Qué hace: lee las unidades, las altas pendientes (`residentes_habilitados` aún sin registrar) y los
 * residentes ya registrados (`perfiles` con rol residente); da de alta un correo con su unidad, quita
 * un alta que nadie usó y da de baja a un residente (`activo = false`; los perfiles nunca se borran).
 * Cómo funciona: todas las operaciones dependen de RLS (migración 5): solo la directiva puede leer y
 * escribir `residentes_habilitados` y cambiar `activo` en perfiles ajenos (trigger `proteger_perfil`).
 * El alta habilita el registro del residente (RF1): el trigger `trg_auth_users_crear_perfil` usa esa
 * fila para crear su perfil.
 * También entrega la unidad del usuario con sesión (`obtenerUnidad`), que muestran Inicio y Perfil.
 * Se usa con: `src/hooks/useResidentes.ts` (las pantallas no lo llaman directamente).
 * Depende de: `src/lib/supabase.ts` y de las tablas `unidades`, `sectores`, `residentes_habilitados`
 * y `perfiles`.
 */
import { supabase } from '@/lib/supabase';

/** Unidad con el nombre de su sector, para elegirla al dar de alta (por ejemplo "Torre A · Dpto 302"). */
export type UnidadConSector = {
  id: string;
  codigo: string;
  sectores: { nombre: string };
};

/** Alta hecha por la directiva que el residente todavía no usó para registrarse. */
export type AltaPendiente = {
  id: string;
  nombre: string;
  correo: string;
  creado_en: string;
  unidades: { codigo: string; sectores: { nombre: string } };
};

/** Residente ya registrado (fila de `perfiles`) con su unidad; `activo = false` es dado de baja. */
export type ResidenteRegistrado = {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  // Un residente siempre tiene unidad, pero la columna admite NULL (directiva y guardia no tienen).
  unidades: { codigo: string; sectores: { nombre: string } } | null;
};

/** Datos del formulario de alta. */
export type DatosAlta = {
  /** Nombre completo; el trigger de registro lo divide en nombre y apellido. */
  nombre: string;
  /** Correo con el que el residente creará su cuenta; se guarda en minúsculas y sin espacios. */
  correo: string;
  /** FK → unidades.id */
  unidadId: string;
  /** FK → perfiles.id: el miembro de la directiva que hace el alta. */
  creadoPor: string;
};

/** Lista las unidades habilitadas con su sector, ordenadas por código. */
export async function listarUnidades(): Promise<UnidadConSector[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('id, codigo, sectores(nombre)')
    .eq('habilitada', true)
    .order('codigo');
  if (error) throw error;
  return data;
}

/**
 * Trae una unidad con el nombre de su sector, para mostrar dónde vive el residente con sesión
 * ("Torre A · A-101") en Inicio, Perfil y la pantalla de votar.
 *
 * @param unidadId FK → unidades.id (valor de `perfiles.unidad_id`).
 * @returns la unidad, o `null` si no existe.
 */
export async function obtenerUnidad(unidadId: string): Promise<UnidadConSector | null> {
  const { data, error } = await supabase
    .from('unidades')
    .select('id, codigo, sectores(nombre)')
    .eq('id', unidadId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Texto de una unidad con su sector, por ejemplo "Torre A · A-101". */
export function textoDeUnidad(unidad: { codigo: string; sectores: { nombre: string } }): string {
  return `${unidad.sectores.nombre} · ${unidad.codigo}`;
}

/** Lista las altas que aún nadie usó para registrarse, de la más reciente a la más antigua. */
export async function listarAltasPendientes(): Promise<AltaPendiente[]> {
  const { data, error } = await supabase
    .from('residentes_habilitados')
    .select('id, nombre, correo, creado_en, unidades(codigo, sectores(nombre))')
    .eq('registrado', false)
    .order('creado_en', { ascending: false });
  if (error) throw error;
  return data;
}

/** Lista los residentes registrados (activos y dados de baja), ordenados por apellido. */
export async function listarResidentes(): Promise<ResidenteRegistrado[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, activo, unidades(codigo, sectores(nombre))')
    .eq('rol', 'residente')
    .order('apellido')
    .order('nombre');
  if (error) throw error;
  return data;
}

/**
 * Da de alta un correo con su unidad (RF5): desde ese momento el correo puede registrarse (RF1).
 * Lanza el error de Supabase si falla; el código `23505` significa que el correo ya estaba dado de alta.
 */
export async function darDeAlta(datos: DatosAlta): Promise<void> {
  const { error } = await supabase.from('residentes_habilitados').insert({
    nombre: datos.nombre.trim(),
    // La base exige el correo normalizado (restricción ck_residentes_correo_normalizado).
    correo: datos.correo.trim().toLowerCase(),
    unidad_id: datos.unidadId,
    creado_por: datos.creadoPor,
  });
  if (error) throw error;
}

/**
 * Quita un alta que todavía no se usó: ese correo ya no podrá registrarse.
 * El filtro `registrado = false` evita borrar el alta de alguien que ya tiene perfil (a ese residente
 * se le da de baja con `darDeBaja`).
 *
 * @param altaId id de la fila de `residentes_habilitados`.
 */
export async function quitarAlta(altaId: string): Promise<void> {
  const { error } = await supabase
    .from('residentes_habilitados')
    .delete()
    .eq('id', altaId)
    .eq('registrado', false);
  if (error) throw error;
}

/**
 * Da de baja a un residente (RF5): su perfil queda con `activo = false`. No se borra nada: con el
 * perfil inactivo, RLS ya no le deja ver datos y la app lo saca con "Tu cuenta está desactivada".
 *
 * @param perfilId id del perfil del residente (el mismo de `auth.users`).
 */
export async function darDeBaja(perfilId: string): Promise<void> {
  // El filtro por rol impide dar de baja por error a un guardia o a otro miembro de la directiva.
  const { data, error } = await supabase
    .from('perfiles')
    .update({ activo: false })
    .eq('id', perfilId)
    .eq('rol', 'residente')
    .select('id');
  if (error) throw error;
  // Sin filas actualizadas, RLS o el filtro lo impidieron: se avisa en vez de aparentar éxito.
  if (data.length === 0) throw new Error('No se encontró el residente');
}

/**
 * Traduce un error de este repositorio a un texto en español para la directiva.
 *
 * @param error lo que lanzó una función de este archivo (error de Postgres vía Supabase o de red).
 * @returns un mensaje corto; los errores no previstos usan un mensaje genérico.
 */
export function mensajeDeErrorResidentes(error: unknown): string {
  // Los errores de Postgres llegan como objetos con `code` (SQLSTATE).
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (codigo) {
    case '23505': // unique_violation: residentes_habilitados.correo es único
      return 'Ese correo ya fue dado de alta.';
    case '23503': // foreign_key_violation: la unidad no existe
      return 'La unidad elegida ya no existe. Elige otra.';
    case '23514': // check_violation: correo sin normalizar
      return 'Escribe un correo válido.';
    case '42501': // insufficient_privilege: RLS o trigger
      return 'Solo la directiva puede hacer esta operación.';
  }
  return 'No pudimos completar la operación. Revisa tu conexión e inténtalo de nuevo.';
}

/**
 * Repositorio de pases de visita: crear, listar, anular, validar el ingreso y registrar la salida
 * (RF15 a RF22).
 *
 * Qué hace: concentra todo lo que la app hace con `pases_visita`, para el residente (sus pases) y para
 * el guardia (validar y registrar la salida).
 * Cómo funciona: crear un pase y validarlo pasa por las Edge Functions `crear-pase` y `validar-pase`,
 * porque la app no puede insertar pases ni tocar el ingreso (regla 3 de CLAUDE.md). Listar y anular van
 * directo a la tabla: las políticas RLS dejan que el residente lea los suyos y solo cambie el estado a
 * `anulado`, y que el guardia lea los de hoy. El estado "vencido" no se guarda: se calcula con
 * `estadoVisible`. `escucharMisPases` usa Realtime para avisar al residente cuando su visita ingresa
 * (RF21, con la app abierta).
 * Se usa con: `src/hooks/usePases.ts` y las pantallas `residente/(tabs)/visitas.tsx` (P6),
 * `guardia/(tabs)/escaner.tsx` (P11) y `guardia/visitas.tsx`.
 * Depende de: `src/lib/supabase.ts`, `src/repositorios/funciones.ts` (`invocarFuncion`),
 * `supabase/functions/crear-pase`, `supabase/functions/validar-pase` y la migración
 * `20261111000001_realtime_pases.sql`.
 */
import { supabase } from '@/lib/supabase';
import { invocarFuncion } from '@/repositorios/funciones';
import type { Database } from '@/tipos/base_de_datos';

/** Estado guardado en la base: `vigente`, `usado` o `anulado`. */
export type EstadoPase = Database['public']['Enums']['estado_pase'];

/** Estado que ve el usuario: los tres de la base más `vencido`, que se calcula. */
export type EstadoVisible = EstadoPase | 'vencido';

/** Pase tal como lo ve el residente en su lista. */
export type Pase = {
  /** UUID v4 generado por Postgres: es el contenido del código QR (RF16). */
  id: string;
  nombre_visitante: string;
  /** Día de la visita, "AAAA-MM-DD"; el pase solo vale ese día. */
  fecha_visita: string;
  /** Hora estimada, "HH:MM:SS"; puede faltar en pases antiguos. */
  hora_estimada: string | null;
  estado: EstadoPase;
  ingreso_en: string | null;
  salida_en: string | null;
  anulado_en: string | null;
};

/** Datos del formulario "Nuevo pase" (RF15). */
export type DatosPase = {
  nombreVisitante: string;
  /** "AAAA-MM-DD" en hora de Lima. */
  fechaVisita: string;
  /** "HH:MM" en hora de Lima. */
  horaEstimada: string;
};

/** Pase que ve el guardia: lo responde `validar-pase` y lo lista "Visitas de hoy". */
export type PaseGuardia = {
  id: string;
  nombre_visitante: string;
  /** Unidad con su sector, por ejemplo "Torre A · Dpto 302". */
  unidad: string;
  /** Residente que creó el pase; solo viene en la respuesta de `validar-pase`. */
  autorizo?: string;
  ingreso_en: string | null;
  salida_en: string | null;
};

/** Respuesta de la función `validar-pase` cuando la acción sale bien. */
type RespuestaValidar = { resultado: string; pase: PaseGuardia };

const COLUMNAS_PASE =
  'id, nombre_visitante, fecha_visita, hora_estimada, estado, ingreso_en, salida_en, anulado_en';

/**
 * Calcula el estado que se muestra: un pase `vigente` cuyo día ya pasó está `vencido` (RNF3).
 *
 * @param pase estado y día de la visita.
 * @param hoy día actual en Lima, "AAAA-MM-DD" (`hoyEnLima()` de `src/utilidades/fechas.ts`).
 */
export function estadoVisible(
  pase: Pick<Pase, 'estado' | 'fecha_visita'>,
  hoy: string,
): EstadoVisible {
  return pase.estado === 'vigente' && pase.fecha_visita < hoy ? 'vencido' : pase.estado;
}

/**
 * Lista los pases de un residente, del día más reciente al más antiguo.
 *
 * @param residenteId FK → perfiles.id (el residente con sesión).
 */
export async function listarMisPases(residenteId: string): Promise<Pase[]> {
  const { data, error } = await supabase
    .from('pases_visita')
    .select(COLUMNAS_PASE)
    .eq('residente_id', residenteId)
    .order('fecha_visita', { ascending: false })
    .order('creado_en', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Crea un pase de visita con la Edge Function `crear-pase` (RF15, RF16).
 * La función toma el residente y la unidad de la sesión y devuelve el pase con su id (el código QR).
 *
 * @throws ErrorFuncion con un mensaje en español si los datos no son válidos o la llamada falla.
 */
export function crearPase(datos: DatosPase): Promise<Pase> {
  return invocarFuncion<Pase>('crear-pase', {
    nombre_visitante: datos.nombreVisitante.trim(),
    fecha_visita: datos.fechaVisita,
    hora_estimada: datos.horaEstimada,
  });
}

/**
 * Anula un pase vigente (RF22). El trigger `proteger_pase` guarda `anulado_en`.
 * Un pase usado o ya anulado no cambia: RLS no devuelve filas y se lanza un error.
 *
 * @param paseId id del pase a anular.
 */
export async function anularPase(paseId: string): Promise<void> {
  const { data, error } = await supabase
    .from('pases_visita')
    .update({ estado: 'anulado' })
    .eq('id', paseId)
    .eq('estado', 'vigente')
    .select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('El pase ya no está vigente');
}

/**
 * Valida el ingreso de una visita con la Edge Function `validar-pase` (RF18, RF19, RF20).
 *
 * @param codigo texto leído del QR (el id del pase).
 * @returns los datos del pase que acaba de ingresar.
 * @throws ErrorFuncion con el motivo: "Pase no válido o vencido", "Pase ya usado" o "Pase anulado".
 */
export async function validarPase(codigo: string): Promise<PaseGuardia> {
  const respuesta = await invocarFuncion<RespuestaValidar>('validar-pase', {
    codigo: codigo.trim(),
    accion: 'ingreso',
  });
  return respuesta.pase;
}

/**
 * Registra la salida de una visita que ya ingresó (RF20).
 *
 * @param paseId id del pase.
 */
export async function registrarSalida(paseId: string): Promise<PaseGuardia> {
  const respuesta = await invocarFuncion<RespuestaValidar>('validar-pase', {
    codigo: paseId,
    accion: 'salida',
  });
  return respuesta.pase;
}

/**
 * Lista las visitas de hoy que ya ingresaron, para que el guardia registre su salida (RF20).
 * RLS solo deja ver al guardia los pases del día actual en Lima; aquí se filtran los usados.
 */
export async function listarVisitasDeHoy(): Promise<PaseGuardia[]> {
  const { data, error } = await supabase
    .from('pases_visita')
    .select('id, nombre_visitante, ingreso_en, salida_en, unidades(codigo, sectores(nombre))')
    .eq('estado', 'usado')
    .order('ingreso_en', { ascending: false });
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    nombre_visitante: p.nombre_visitante,
    unidad: `${p.unidades.sectores.nombre} · ${p.unidades.codigo}`,
    ingreso_en: p.ingreso_en,
    salida_en: p.salida_en,
  }));
}

/**
 * Escucha en vivo los cambios de los pases de un residente (RF21, con la app abierta).
 *
 * @param residenteId FK → perfiles.id; Realtime además aplica RLS, así que solo llegan sus pases.
 * @param alCambiar recibe el pase actualizado (por ejemplo, cuando pasa a `usado`).
 * @returns una función para dejar de escuchar; hay que llamarla al salir de la pantalla.
 */
export function escucharMisPases(residenteId: string, alCambiar: (pase: Pase) => void): () => void {
  const canal = supabase
    .channel(`pases-${residenteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pases_visita',
        filter: `residente_id=eq.${residenteId}`,
      },
      (cambio) => alCambiar(cambio.new as Pase),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(canal);
  };
}

/**
 * Traduce un error de este repositorio a un texto en español.
 * Los errores de las Edge Functions (`ErrorFuncion`) ya traen su mensaje listo.
 */
export function mensajeDeErrorPase(error: unknown): string {
  if (error instanceof Error && error.name === 'ErrorFuncion') return error.message;
  if (error instanceof Error && error.message === 'El pase ya no está vigente') {
    return 'Este pase ya fue usado o anulado; no se puede anular.';
  }
  return 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.';
}

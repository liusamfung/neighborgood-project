/**
 * Repositorio de la garita: el guardia valida el pase que escaneó y queda registrado el ingreso
 * (RF18, RF19); también lista las visitas de hoy y registra su salida (RF20).
 *
 * Qué hace: manda el código leído del QR a la Edge Function `validar-pase`, que marca el pase como usado, y
 * devuelve el pase con la hora del ingreso. Si la función lo rechaza ("Pase no válido o vencido", "Pase ya
 * usado", "Pase anulado"), lanza un `ErrorFuncion` cuyo `message` es ese motivo, listo para mostrarse.
 * Las pantallas no hablan con Supabase directamente (RNF7).
 * Cómo funciona: la app solo manda el texto del QR con el JWT del guardia; la función comprueba su rol y
 * decide con la hora de Lima del servidor (el teléfono no decide si un pase está vencido, regla 3).
 * Las visitas de hoy se leen directo de `pases_visita`: RLS ya limita al guardia a los pases del día en
 * Lima. La salida, en cambio, la escribe la Edge Function: la app no tiene permiso sobre `salida_en`.
 * Se usa con: `src/hooks/useValidarPase.ts`, `src/hooks/useVisitasDeHoy.ts` y
 * `src/hooks/useRegistrarSalida.ts`.
 * Depende de: `src/repositorios/funciones.ts` (`invocarFuncion`), `src/lib/supabase.ts` y
 * `supabase/functions/validar-pase`.
 */
import { supabase } from '@/lib/supabase';
import { invocarFuncion } from '@/repositorios/funciones';
import type {
  PaseValidado,
  RespuestaValidacion,
  SalidaRegistrada,
  VisitaDeHoy,
} from '@/tipos/validacionPase';

/**
 * Valida el código de un pase en la garita.
 *
 * @param codigo el texto que leyó la cámara o que escribió el guardia.
 * @returns el pase válido con el visitante, la unidad, quién lo autorizó y la hora del ingreso.
 * @throws ErrorFuncion con el motivo del rechazo, o con un mensaje de conexión.
 */
export async function validarPase(codigo: string): Promise<PaseValidado> {
  const respuesta = await invocarFuncion<RespuestaValidacion>('validar-pase', {
    codigo: codigo.trim(),
  });
  return respuesta.pase;
}

/**
 * Visitas de hoy (RF20): las que ya ingresaron primero (la más reciente arriba), luego las que se esperan,
 * por hora estimada. No incluye los pases anulados, que nunca van a llegar. Lanza el error de Supabase si
 * falla.
 */
export async function listarVisitasDeHoy(): Promise<VisitaDeHoy[]> {
  const { data, error } = await supabase
    .from('pases_visita')
    .select(
      'id, nombre_visitante, hora_estimada, estado, ingreso_en, salida_en, unidades(codigo, sectores(nombre))',
    )
    .neq('estado', 'anulado')
    .order('ingreso_en', { ascending: false, nullsFirst: false })
    .order('hora_estimada', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Registra la salida de una visita que ya ingresó (RF20).
 *
 * @param paseId código del pase.
 * @returns la salida con su hora exacta.
 * @throws ErrorFuncion si la visita no ingresó, si su salida ya estaba registrada o sin conexión.
 */
export async function registrarSalida(paseId: string): Promise<SalidaRegistrada> {
  const respuesta = await invocarFuncion<{ pase: SalidaRegistrada }>('validar-pase', {
    codigo: paseId,
    accion: 'salida',
  });
  return respuesta.pase;
}

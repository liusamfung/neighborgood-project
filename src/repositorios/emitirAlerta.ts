/**
 * Emisión de la alerta de pánico (RF23): crea la alerta y lee la ubicación del residente.
 *
 * Qué hace: inserta una fila en `alertas` con solo el emisor, su unidad y el tipo; la base completa el
 * resto (el trigger `trg_alertas_completar` fija sector, estado `activa` y hora, así el teléfono no puede
 * falsearlos). También lee el nombre de la unidad y su sector para mostrar "Torre A · 302".
 * Cómo funciona: no usa una Edge Function ni `service_role`: la política RLS "alertas: el residente emite
 * desde su unidad" ya exige que el emisor sea quien tiene la sesión y que la unidad sea la suya. Nunca
 * reintenta una escritura incierta: si falla, la pantalla muestra el error y la persona decide.
 * Se usa con: `src/hooks/useEmitirAlerta.ts`. El repositorio de RF27 (`alertas.ts`, atender alertas) es
 * aparte, a propósito: este solo emite.
 * Depende de: `src/lib/supabase.ts` y los tipos de `src/tipos/alerta.ts`.
 */
import { supabase } from '@/lib/supabase';
import type { AlertaEmitida, TipoAlerta, UnidadAlerta } from '@/tipos/alerta';
import type { TablesInsert } from '@/tipos/base_de_datos';

/**
 * Lee el código y el sector de una unidad (RLS deja leer `unidades` y `sectores` a todo usuario activo).
 *
 * @param unidadId id de la unidad del residente (`perfiles.unidad_id`).
 * @returns la unidad con su sector, o `null` si no existe.
 */
export async function obtenerUbicacion(unidadId: string): Promise<UnidadAlerta | null> {
  const { data, error } = await supabase
    .from('unidades')
    .select('codigo, sectores(nombre)')
    .eq('id', unidadId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Crea una alerta de pánico desde la unidad del residente.
 *
 * @param emisorId id del residente que la envía (el de la sesión; la política RLS lo comprueba).
 * @param unidadId unidad desde la que se envía (la suya; la política RLS lo comprueba).
 * @param tipo `medica`, `incendio` o `seguridad`.
 * @returns la alerta creada, ya con estado y hora fijados por la base y con su ubicación.
 */
export async function emitirAlerta(
  emisorId: string,
  unidadId: string,
  tipo: TipoAlerta,
): Promise<AlertaEmitida> {
  // El tipo generado pide `sector_id` (la columna es NOT NULL), pero lo llena el trigger
  // `trg_alertas_completar` y el GRANT solo deja enviar emisor, unidad y tipo (migración 5). Por eso
  // se declara el envío parcial; el tipo generado no se edita.
  const fila = { emisor_id: emisorId, unidad_id: unidadId, tipo } as TablesInsert<'alertas'>;
  const { data, error } = await supabase
    .from('alertas')
    .insert(fila)
    .select('id, tipo, estado, creada_en, unidad:unidades(codigo, sectores(nombre))')
    .single();
  if (error) throw error;
  return data;
}

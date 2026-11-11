/**
 * Tipos del pase de visita: el pase tal como lo devuelve el servidor y el borrador de la pantalla P6.
 *
 * Qué hace: da nombres cortos a los tipos de Supabase y define lo que el residente llena antes de generar
 * un pase (RF15). No contiene lógica.
 * Se usa con: `src/utilidades/borradorPase.ts` y `src/utilidades/formatosPase.ts`, `src/repositorios/pases.ts`
 * (crea y lista pases), `src/hooks/useCrearPase.ts`, `src/hooks/useMisPases.ts`,
 * `src/componentes/visitas/TarjetaPase.tsx` y la pantalla `src/app/residente/(tabs)/visitas.tsx`.
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Database, Tables } from '@/tipos/base_de_datos';

/** Estado de un pase: `vigente`, `usado` o `anulado`. El estado "vencido" no se guarda: se calcula al escanear. */
export type EstadoPase = Database['public']['Enums']['estado_pase'];

/** Las columnas de `pases_visita` que la app necesita; es lo que devuelven `crear-pase` y la lista. */
export type Pase = Pick<
  Tables<'pases_visita'>,
  'id' | 'nombre_visitante' | 'fecha_visita' | 'hora_estimada' | 'estado' | 'creado_en'
>;

/** Lo que el residente llena en la pantalla P6 antes de generar el pase. */
export type BorradorPase = {
  /** Nombre del invitado. */
  nombre: string;
  /** Día y hora estimada de llegada, juntos en un solo `Date` (así lo entrega `CampoFecha`). */
  llegada: Date;
};

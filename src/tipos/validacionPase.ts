/**
 * Tipos de la garita (RF18 a RF20): lo que responde la Edge Function `validar-pase` y las visitas de hoy.
 *
 * Qué hace: describe el pase válido tal como lo ve el guardia (sin ids internos del residente), la salida
 * registrada y cada visita de la lista "Visitas de hoy". No contiene lógica. `PaseValidado` y
 * `SalidaRegistrada` deben coincidir con los de `supabase/functions/validar-pase/manejador.ts`.
 * Se usa con: `src/repositorios/validacionPases.ts`, los hooks `useValidarPase`, `useVisitasDeHoy` y
 * `useRegistrarSalida`, los componentes `ResultadoEscaneo` y `TarjetaVisita` y las pantallas
 * `src/app/guardia/(tabs)/escaner.tsx` y `src/app/guardia/visitas.tsx`.
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Tables } from '@/tipos/base_de_datos';

/** Pase que el guardia puede dejar ingresar: quién viene, a qué unidad y quién lo autorizó. */
export type PaseValidado = {
  /** Código del pase (el UUID que trae el QR). */
  id: string;
  nombre_visitante: string;
  /** Unidad con su sector, por ejemplo "Torre A · 302". */
  unidad: string;
  /** Nombre del residente que creó el pase. */
  autorizo: string;
  /** Día de la visita, `YYYY-MM-DD`. */
  fecha_visita: string;
  /** Hora estimada de llegada, `HH:MM:SS`, o `null` si no se indicó. */
  hora_estimada: string | null;
  /** Hora exacta en que quedó registrado el ingreso (ISO 8601): desde ahí el pase está `usado` (RF19). */
  ingreso_en: string;
};

/**
 * Respuesta de `validar-pase` cuando el pase es válido: el ingreso ya quedó registrado. Los rechazos
 * llegan como `ErrorFuncion`.
 */
export type RespuestaValidacion = {
  resultado: 'ingreso_registrado';
  pase: PaseValidado;
};

/** Respuesta de `validar-pase` al registrar la salida de una visita (RF20). */
export type SalidaRegistrada = {
  id: string;
  nombre_visitante: string;
  /** Hora exacta de la salida (ISO 8601). */
  salida_en: string;
};

/**
 * Una visita de hoy como la ve el guardia en "Visitas de hoy" (RF20): el pase con su unidad y sector.
 * RLS solo deja al guardia leer los pases del día en Lima.
 */
export type VisitaDeHoy = Pick<
  Tables<'pases_visita'>,
  'id' | 'nombre_visitante' | 'hora_estimada' | 'estado' | 'ingreso_en' | 'salida_en'
> & {
  /** Unidad del pase (FK → unidades.id) con el nombre de su sector. */
  unidades: { codigo: string; sectores: { nombre: string } | null } | null;
};

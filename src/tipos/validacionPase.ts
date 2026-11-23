/**
 * Tipos de la validación de un pase en la garita (RF18, RF19): lo que responde la Edge Function
 * `validar-pase`.
 *
 * Qué hace: describe el pase válido tal como lo ve el guardia (sin ids internos del residente). No contiene
 * lógica. La forma debe coincidir con `PaseValidado` de `supabase/functions/validar-pase/manejador.ts`.
 * Se usa con: `src/repositorios/validacionPases.ts`, `src/hooks/useValidarPase.ts`,
 * `src/componentes/visitas/ResultadoEscaneo.tsx` y la pantalla `src/app/guardia/(tabs)/escaner.tsx`.
 */

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

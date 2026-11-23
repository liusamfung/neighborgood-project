/**
 * Tipos de la alerta de pánico (RF23).
 *
 * Qué hace: da nombres cortos a los tipos que genera Supabase para el tipo y el estado de una alerta, y
 * describe la ubicación de una alerta (la unidad del residente y su sector) y la alerta recién emitida.
 * No contiene lógica.
 * Se usa con: `src/repositorios/emitirAlerta.ts`, `src/hooks/useEmitirAlerta.ts`,
 * `src/utilidades/alertaEmergencia.ts` y las pantallas P2, P3 y P3b del residente.
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Database } from '@/tipos/base_de_datos';

/** Tipo de alerta: viene del enumerado `tipo_alerta` (`medica`, `incendio` o `seguridad`). */
export type TipoAlerta = Database['public']['Enums']['tipo_alerta'];

/** Estado de una alerta: viene del enumerado `estado_alerta` (`activa`, `en_camino` o `atendida`). */
export type EstadoAlerta = Database['public']['Enums']['estado_alerta'];

/**
 * Ubicación de una alerta: la de la unidad del residente (regla 4 de CLAUDE.md: sin GPS ni mapas).
 * `sectores` puede ser `null` si la unidad no tuviera sector.
 */
export type UnidadAlerta = {
  codigo: string;
  sectores: { nombre: string } | null;
};

/** Alerta recién creada, con lo que muestra la pantalla "Alerta enviada" (P3b). */
export type AlertaEmitida = {
  id: string;
  tipo: TipoAlerta;
  estado: EstadoAlerta;
  creada_en: string;
  unidad: UnidadAlerta | null;
};

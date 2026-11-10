/**
 * Colores del sistema de diseño "Vecindario cálido" (docs/design/DISENO.md).
 *
 * Qué hace: concentra todos los colores para no escribirlos a mano en las pantallas.
 * Se usa con: los componentes de `src/componentes` y las pantallas, mediante '@/tema'.
 * Las claves de los chips coinciden con los estados de la base de datos (incidencia, pase y alerta).
 */
/** Paleta base: principal (teal), acento (ámbar), fondos, bordes, textos y colores de emergencia. */
export const colores = {
  principal: '#0F766E',
  suave: '#D5EFEA',
  acento: '#F59E0B',
  fondo: '#F6F8F7',
  superficie: '#FFFFFF',
  borde: '#E2E8E6',
  bordeCampo: '#CBD5D1',
  texto: '#1F2937',
  textoSecundario: '#5B6672',
  emergencia: '#DC2626',
  peligroTexto: '#B91C1C',
  peligroBorde: '#DC2626',
} as const;

/** Un color por tipo de alerta de pánico (RF23): médica, incendio y seguridad. */
export const coloresAlerta = {
  medica: '#DC2626',
  incendio: '#C2410C',
  seguridad: '#4338CA',
} as const;

/** Par de colores de una insignia (chip): fondo y texto. */
type Chip = { fondo: string; texto: string };

/** Colores de la insignia de estado de una incidencia (RF30). */
export const chipsIncidencia = {
  pendiente: { fondo: '#FEF3C7', texto: '#92400E' },
  en_atencion: { fondo: '#DBEAFE', texto: '#1D4ED8' },
  resuelto: { fondo: '#DCFCE7', texto: '#15803D' },
} as const satisfies Record<string, Chip>;

/** Colores de la insignia de estado de un pase de visita (RF15, RF22). */
export const chipsPase = {
  vigente: { fondo: '#DCFCE7', texto: '#15803D' },
  usado: { fondo: '#E5E7EB', texto: '#374151' },
  anulado: { fondo: '#FEE2E2', texto: '#991B1B' },
} as const satisfies Record<string, Chip>;

// DISENO.md no fija colores para los estados de alerta: se reutilizan los del mockup original
// (pendiente, en atención y resuelto). Falta confirmarlos con el diseño.
export const chipsAlerta = {
  activa: chipsIncidencia.pendiente,
  en_camino: chipsIncidencia.en_atencion,
  atendida: chipsIncidencia.resuelto,
} as const satisfies Record<string, Chip>;

/** Texto que ve el usuario para cada estado de alerta (RF27). */
export const etiquetasAlerta = {
  activa: 'Activa',
  en_camino: 'En camino',
  atendida: 'Atendida',
} as const;

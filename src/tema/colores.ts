// Sistema de diseño "Vecindario cálido" (docs/design/DISENO.md).
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

export const coloresAlerta = {
  medica: '#DC2626',
  incendio: '#C2410C',
  seguridad: '#4338CA',
} as const;

type Chip = { fondo: string; texto: string };

export const chipsIncidencia = {
  pendiente: { fondo: '#FEF3C7', texto: '#92400E' },
  en_atencion: { fondo: '#DBEAFE', texto: '#1D4ED8' },
  resuelto: { fondo: '#DCFCE7', texto: '#15803D' },
} as const satisfies Record<string, Chip>;

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

export const etiquetasAlerta = {
  activa: 'Activa',
  en_camino: 'En camino',
  atendida: 'Atendida',
} as const;

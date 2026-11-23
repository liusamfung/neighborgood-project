/**
 * Reglas puras del botón de pánico (RF23): tipos de alerta, textos y mensajes de error.
 *
 * Qué hace: concentra, sin red ni pantalla, lo que las pantallas P2, P3 y P3b necesitan saber: los tres tipos
 * de alerta con su título, descripción e ícono; el tipo que viene marcado; el texto del botón de confirmar;
 * la ubicación ("Torre A · 302"); la hora en Lima ("Hoy, 6:42 p. m.") y los mensajes de error en español.
 * Se usa con: `src/app/residente/alerta/tipo.tsx`, `src/app/residente/alerta/enviada.tsx`,
 * `src/app/residente/(tabs)/index.tsx` y `src/componentes/alertas/OpcionTipoAlerta.tsx`.
 * Depende de: solo del tipo `TipoAlerta`. No importa nada de React Native, para poder probarse con
 * `node:test` (`herramientas/pruebas/alertaEmergencia.test.cjs`, `npm run test:alerta`).
 */
import type { TipoAlerta, UnidadAlerta } from '@/tipos/alerta';

/** Nombres de los íconos de Ionicons que usan las opciones: botiquín, llama y escudo. */
export type IconoAlerta = 'medkit' | 'flame' | 'shield';

/** Una opción de la pantalla "Enviar alerta": el tipo y lo que se le muestra a la persona. */
export type OpcionAlerta = {
  tipo: TipoAlerta;
  titulo: string;
  descripcion: string;
  icono: IconoAlerta;
};

/** Los tres tipos de alerta, en el orden del mockup P3 (los colores salen de `coloresAlerta` en el tema). */
export const TIPOS_ALERTA: readonly OpcionAlerta[] = [
  {
    tipo: 'medica',
    titulo: 'Médica',
    descripcion: 'Una persona necesita ayuda médica',
    icono: 'medkit',
  },
  {
    tipo: 'incendio',
    titulo: 'Incendio',
    descripcion: 'Fuego, humo o fuga de gas',
    icono: 'flame',
  },
  {
    tipo: 'seguridad',
    titulo: 'Seguridad',
    descripcion: 'Intruso, robo o situación sospechosa',
    icono: 'shield',
  },
];

/** Tipo que viene marcado al abrir P3, como en el mockup: en una emergencia basta confirmar. */
export const TIPO_POR_DEFECTO: TipoAlerta = 'medica';

/** true si el valor es uno de los tres tipos de alerta de la base (sirve para validar parámetros de ruta). */
export function esTipoAlerta(valor: unknown): valor is TipoAlerta {
  return TIPOS_ALERTA.some((opcion) => opcion.tipo === valor);
}

// Cómo se dice cada tipo dentro de la frase "Confirmar alerta ...".
const FRASE_CONFIRMAR: Record<TipoAlerta, string> = {
  medica: 'médica',
  incendio: 'de incendio',
  seguridad: 'de seguridad',
};

/** Texto del botón de confirmar, por ejemplo "Confirmar alerta médica" o "Confirmar alerta de incendio". */
export function textoConfirmar(tipo: TipoAlerta): string {
  return `Confirmar alerta ${FRASE_CONFIRMAR[tipo]}`;
}

/** Título corto de un tipo ("Médica", "Incendio" o "Seguridad"); vacío si no es un tipo válido. */
export function tituloDeTipo(tipo: unknown): string {
  return TIPOS_ALERTA.find((opcion) => opcion.tipo === tipo)?.titulo ?? '';
}

/**
 * Ubicación de la alerta como texto, igual que la ve el guardia en el escáner: "Torre A · 302".
 * Si la unidad no tiene sector se muestra solo su código; sin unidad, texto vacío.
 */
export function textoUbicacion(unidad: UnidadAlerta | null | undefined): string {
  if (!unidad) return '';
  const sector = unidad.sectores?.nombre;
  return sector ? `${sector} · ${unidad.codigo}` : unidad.codigo;
}

/** Año, mes y día de un instante en la zona horaria de Lima (no la del teléfono). */
function partesLima(fecha: Date): { anio: string; mes: string; dia: string } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}

/**
 * Hora de la alerta en Lima: "Hoy, 6:42 p. m." si fue hoy, o "22/11, 6:42 p. m." si fue otro día.
 *
 * @param iso instante de creación de la alerta (`creada_en`, ISO 8601).
 * @param ahora instante de referencia para saber qué día es hoy; se cambia en las pruebas.
 * @returns el texto, o vacío si `iso` no es una fecha válida.
 */
export function textoHoraAlerta(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const hora = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
  const dia = partesLima(fecha);
  const hoy = partesLima(ahora);
  const esHoy = dia.anio === hoy.anio && dia.mes === hoy.mes && dia.dia === hoy.dia;
  return esHoy ? `Hoy, ${hora}` : `${dia.dia}/${dia.mes}, ${hora}`;
}

/**
 * Traduce un error al enviar la alerta a un mensaje en español, sin detalles internos de SQL.
 *
 * Un reintento puede crear una segunda alerta si la primera sí llegó pero la respuesta se perdió; en una
 * emergencia eso es preferible a perderla, por eso el mensaje invita a reintentar y a avisar a la guardia.
 *
 * @param error lo que lanzó Supabase o la red.
 */
export function mensajeErrorAlerta(error: unknown): string {
  const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (codigo === '42501' || codigo === 'PGRST301' || codigo === 'PGRST302') {
    return 'No tienes permiso para enviar alertas con esta cuenta. Cierra sesión e inicia de nuevo.';
  }
  if (codigo === '23503') return 'Tu unidad no está registrada. Contacta a la directiva.';
  return 'No pudimos enviar la alerta. Revisa tu conexión e inténtalo de nuevo. Si es urgente, avisa directamente a la guardia.';
}

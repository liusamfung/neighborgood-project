/**
 * Reglas del formulario RF4 y mensajes de sus operaciones, sin dependencias de red ni de React.
 * Las usan EditorContacto y el repositorio de contactos; las pruebas ejercitan validación,
 * normalización y reutilización de posiciones. El límite definitivo lo impone PostgreSQL.
 */
import type { BorradorContacto, ContactoEmergencia } from '@/tipos/contacto';

/** Límite del modelo: CHECK orden entre 1 y 3 más UNIQUE (usuario_id, orden). */
export const MAXIMO_CONTACTOS = 3;

/**
 * Prepara el número para la aplicación de teléfono: conserva + y dígitos y retira separadores.
 * Rechaza datos antiguos inválidos y secuencias de control; nunca interpreta el campo como URL.
 * La usan TarjetaContacto para habilitar Llamar y el servicio del marcador del dispositivo.
 */
export function enlaceTelefono(telefono: string): `tel:${string}` | null {
  const valor = telefono.trim();
  if (!/^\+?[\d ()-]+$/.test(valor) || !/\d/.test(valor)) return null;
  return `tel:${valor.replace(/[ ()-]/g, '')}`;
}

/** Errores que se muestran junto al campo correspondiente, después de intentar guardar. */
export type ErroresContacto = Partial<Record<keyof BorradorContacto, string>>;

/** Crea un borrador independiente, vacío o con los campos editables de una fila existente. */
export function borradorContacto(contacto?: ContactoEmergencia | null): BorradorContacto {
  return {
    nombre: contacto?.nombre ?? '',
    telefono: contacto?.telefono ?? '',
    parentesco: contacto?.parentesco ?? '',
    correo: contacto?.correo ?? '',
  };
}

/** Revisa los campos de RF4 sin exigir un prefijo de país ni un número exclusivo de Perú. */
export function validarContacto(borrador: BorradorContacto): ErroresContacto {
  const errores: ErroresContacto = {};
  if (!borrador.nombre.trim()) errores.nombre = 'Escribe el nombre del contacto.';
  const telefono = borrador.telefono.trim();
  if (!telefono) errores.telefono = 'Escribe el teléfono del contacto.';
  else if (!/^\+?[\d ()-]+$/.test(telefono) || !/\d/.test(telefono)) {
    errores.telefono = 'Usa números; puedes incluir +, espacios, guiones y paréntesis.';
  }
  if (!borrador.parentesco.trim()) errores.parentesco = 'Indica tu relación con el contacto.';
  const correo = borrador.correo.trim();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = 'Revisa el correo o deja este campo vacío.';
  }
  return errores;
}

/** Prepara únicamente los cuatro campos permitidos; un correo vacío se persiste como NULL. */
export function datosContacto(borrador: BorradorContacto) {
  const errores = validarContacto(borrador);
  if (Object.keys(errores).length) throw new Error(Object.values(errores)[0]);
  return {
    nombre: borrador.nombre.trim(),
    telefono: borrador.telefono.trim(),
    parentesco: borrador.parentesco.trim(),
    correo: borrador.correo.trim() || null,
  };
}

/** Busca un hueco real: al borrar la posición 2 de tres contactos, vuelve a usar 2, no 4. */
export function siguienteOrdenContacto(contactos: readonly { orden: number }[]): number | null {
  const ocupados = new Set(contactos.map((contacto) => contacto.orden));
  for (let orden = 1; orden <= MAXIMO_CONTACTOS; orden++) {
    if (!ocupados.has(orden)) return orden;
  }
  return null;
}

/** Traduce errores de permiso, concurrencia y conexión sin mostrar detalles internos de SQL. */
export function mensajeErrorContacto(error: unknown): string {
  const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (codigo === '23505') {
    return 'La lista cambió en otro dispositivo. Actualiza los contactos antes de intentarlo de nuevo.';
  }
  if (codigo === '23514') return 'Solo puedes registrar tres contactos de emergencia.';
  if (codigo === '42501' || codigo === 'PGRST301' || codigo === 'PGRST302') {
    return 'No tienes permiso para realizar esta operación. Revisa tu sesión.';
  }
  if (error instanceof Error && !(error instanceof TypeError)) return error.message;
  return 'No pudimos completar la operación. Revisa tu conexión y actualiza la lista antes de reintentar.';
}

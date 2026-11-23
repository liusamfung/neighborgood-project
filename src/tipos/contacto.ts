/**
 * Tipos de contactos de emergencia (RF4): separan la fila de Supabase del formulario editable.
 * Los usan el repositorio, el hook y los componentes de Perfil. La estructura persistida procede
 * de base_de_datos.ts; el usuario y el orden nunca se introducen en el formulario.
 */
import type { Tables } from '@/tipos/base_de_datos';

/** Contacto persistido, incluida su posición entre 1 y 3 y el usuario propietario. */
export type ContactoEmergencia = Tables<'contactos_emergencia'>;

/** Campos editables del contacto; el correo es opcional y la relación se guarda en parentesco. */
export type BorradorContacto = {
  nombre: string;
  telefono: string;
  parentesco: string;
  correo: string;
};

/**
 * Servicio del dispositivo para RF4: abre el marcador con el teléfono del contacto.
 * Lo usa TarjetaContacto; depende de Linking y de la normalización del formulario.
 * No accede a Supabase ni realiza llamadas automáticamente: la persona confirma en el teléfono.
 */
import { Linking } from 'react-native';

import { enlaceTelefono } from '@/utilidades/contactosEmergencia';

/** Solicita abrir el marcador; informa un fallo sin afirmar que se completó una llamada. */
export async function abrirMarcador(telefono: string): Promise<void> {
  const enlace = enlaceTelefono(telefono);
  if (!enlace) throw new Error('Revisa el teléfono del contacto con Editar antes de llamar.');
  try {
    await Linking.openURL(enlace);
  } catch {
    throw new Error('No se abrió el marcador. Puedes seleccionar y copiar el teléfono.');
  }
}

/**
 * Adaptador de la aplicación de teléfono del dispositivo, usado por TarjetaContacto.
 * Usa Linking de React Native y enlaceTelefono para solicitar abrir un número con tel:.
 * No realiza llamadas por Supabase, no pide CALL_PHONE y no afirma que la llamada se conectó.
 * Se intenta la apertura directamente y se captura el fallo: canOpenURL necesita configuración
 * de visibilidad adicional y puede dar falsos negativos en algunas compilaciones Android/iOS.
 */
import { Linking } from 'react-native';

import { enlaceTelefono } from '@/utilidades/contactosEmergencia';

/** Abre la aplicación de teléfono; la persona termina la acción mediante los controles del sistema. */
export async function abrirMarcador(telefono: string): Promise<void> {
  const enlace = enlaceTelefono(telefono);
  if (!enlace)
    throw new Error('Revisa el teléfono del contacto con el botón Editar antes de llamar.');
  try {
    await Linking.openURL(enlace);
  } catch {
    throw new Error(
      'No se abrió el marcador. Puedes intentarlo otra vez o seleccionar y copiar el teléfono para usarlo en otro equipo.',
    );
  }
}

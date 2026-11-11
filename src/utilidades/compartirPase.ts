/**
 * Compartir un pase de visita por WhatsApp u otra app (RF17).
 *
 * Qué hace: abre el menú "Compartir" del teléfono con la imagen del código QR del pase, para que el
 * residente se la mande a su visitante.
 * Cómo funciona: el componente del QR entrega su imagen como texto base64; aquí se guarda como PNG en
 * la carpeta temporal de la app y se comparte ese archivo con `expo-sharing`. Donde no se puede
 * compartir un archivo (web, o un teléfono cuya app todavía no incluye `expo-sharing`) se comparte un
 * texto con los datos del pase y su código.
 * `expo-sharing` es un módulo nativo: se carga recién al compartir (`import()` dinámico) y no al abrir
 * la pantalla. Así una development build que todavía no se reconstruyó con ese módulo sigue abriendo
 * Visitas con normalidad y solo pierde la imagen al compartir.
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`.
 * Depende de: `expo-file-system`, `expo-sharing` y `src/utilidades/fechas.ts`.
 */
import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import type { Pase } from '@/repositorios/pases';
import { diaLegible, horaLegible } from '@/utilidades/fechas';

/**
 * Guarda el QR como archivo PNG y abre el menú de compartir con esa imagen.
 *
 * @returns `true` si se abrió el menú con la imagen; `false` si este teléfono no puede hacerlo.
 */
async function compartirImagen(pase: Pase, qrBase64: string, titulo: string): Promise<boolean> {
  try {
    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return false;
    // base64 → bytes → archivo PNG temporal (se sobrescribe si el pase ya se compartió antes).
    const bytes = Uint8Array.from(atob(qrBase64), (letra) => letra.charCodeAt(0));
    const archivo = new File(Paths.cache, `pase-${pase.id}.png`);
    if (!archivo.exists) archivo.create();
    await archivo.write(bytes);
    await Sharing.shareAsync(archivo.uri, { mimeType: 'image/png', dialogTitle: titulo });
    return true;
  } catch (error) {
    // Módulo nativo ausente o fallo al escribir el archivo: se comparte el texto.
    console.warn('No se pudo compartir la imagen del pase', error);
    return false;
  }
}

/**
 * Comparte el pase.
 *
 * @param pase pase vigente que se quiere enviar.
 * @param qrBase64 imagen PNG del QR en base64 (sin el prefijo `data:`); `null` si no se pudo generar.
 */
export async function compartirPase(pase: Pase, qrBase64: string | null): Promise<void> {
  const hora = pase.hora_estimada ? ` a las ${horaLegible(pase.hora_estimada)}` : '';
  const mensaje =
    `Pase de visita NeighborGood\n` +
    `Visitante: ${pase.nombre_visitante}\n` +
    `Válido solo el ${diaLegible(pase.fecha_visita)}${hora}\n` +
    `Muestra el código QR en la entrada.`;

  if (Platform.OS !== 'web' && qrBase64) {
    const compartido = await compartirImagen(pase, qrBase64, `Pase de ${pase.nombre_visitante}`);
    if (compartido) return;
  }
  // Sin imagen: al menos viaja el código, que el guardia puede escribir a mano en el escáner.
  await Share.share({ message: `${mensaje}\nCódigo: ${pase.id}` });
}

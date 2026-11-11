/**
 * Compartir un pase de visita por WhatsApp u otra app (RF17).
 *
 * Qué hace: abre el menú "Compartir" del teléfono con la imagen del código QR del pase, para que el
 * residente se la mande a su visitante.
 * Cómo funciona: el componente del QR entrega su imagen como texto base64; aquí se guarda como PNG en
 * la carpeta temporal de la app y se comparte ese archivo con `expo-sharing`. Donde no se puede
 * compartir un archivo (web, o un teléfono sin esa función) se comparte un texto con los datos del
 * pase y su código.
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`.
 * Depende de: `expo-file-system`, `expo-sharing` (módulo nativo: exige reconstruir la development
 * build) y `src/utilidades/fechas.ts`.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import type { Pase } from '@/repositorios/pases';
import { diaLegible, horaLegible } from '@/utilidades/fechas';

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

  if (Platform.OS !== 'web' && qrBase64 && (await Sharing.isAvailableAsync())) {
    // base64 → bytes → archivo PNG temporal (se sobrescribe si el pase ya se compartió antes).
    const bytes = Uint8Array.from(atob(qrBase64), (letra) => letra.charCodeAt(0));
    const archivo = new File(Paths.cache, `pase-${pase.id}.png`);
    if (!archivo.exists) archivo.create();
    await archivo.write(bytes);
    await Sharing.shareAsync(archivo.uri, { mimeType: 'image/png', dialogTitle: mensaje });
    return;
  }
  // Sin imagen: al menos viaja el código, que el guardia puede escribir a mano.
  await Share.share({ message: `${mensaje}\nCódigo: ${pase.id}` });
}

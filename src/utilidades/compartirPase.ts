/**
 * Compartir un pase de visita por WhatsApp, correo u otra app del teléfono (RF17).
 *
 * Qué hace: abre el menú "Compartir" del sistema con la imagen del código QR del pase, para que el
 * residente se la mande a su visitante. Criterio de aceptación del issue #27: "Cuando el residente
 * toca 'Compartir', entonces se abre el menú de compartir del teléfono con la imagen del QR".
 * Cómo funciona: el QR (dibujado con `react-native-qrcode-svg`) entrega su imagen en base64; aquí se
 * guarda como PNG en la caché de la app y se comparte ese archivo con `expo-sharing`.
 * `expo-sharing` es nativo y se carga recién al compartir (`import()` dinámico): si la development
 * build de alguien todavía no se recompiló con él, la pantalla igual abre y se comparte un texto con
 * los datos del pase y su código, en vez de romperse.
 * Se usa con: `src/componentes/visitas/BotonCompartirPase.tsx`.
 * Depende de: `expo-file-system`, `expo-sharing`, `src/tipos/pase.ts` y `src/utilidades/formatosPase.ts`.
 */
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import type { Pase } from '@/tipos/pase';
import { formatearFecha, formatearHora } from '@/utilidades/formatosPase';

/** Texto que acompaña al QR (y que se comparte solo si no se puede mandar la imagen). */
export function textoDelPase(pase: Pase): string {
  return (
    `Pase de visita para ${pase.nombre_visitante}\n` +
    `${formatearFecha(pase.fecha_visita)} · ${formatearHora(pase.hora_estimada)}\n` +
    `Muestra este código QR en la portería. Código: ${pase.id}`
  );
}

/**
 * Guarda el QR como PNG y abre el menú de compartir del teléfono con esa imagen.
 *
 * @param pase pase que se comparte (su `id` es el contenido del QR).
 * @param pngBase64 imagen del QR en base64, sin el prefijo `data:`.
 * @returns `true` si se compartió la imagen; `false` si se tuvo que compartir solo el texto.
 */
export async function compartirPase(pase: Pase, pngBase64: string): Promise<boolean> {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      // Un archivo por pase: si se comparte dos veces, se reemplaza el anterior.
      const archivo = new File(Paths.cache, `pase-${pase.id}.png`);
      if (archivo.exists) archivo.delete();
      archivo.create();
      archivo.write(pngBase64, { encoding: 'base64' });
      await Sharing.shareAsync(archivo.uri, {
        mimeType: 'image/png',
        dialogTitle: `Pase de ${pase.nombre_visitante}`,
        UTI: 'public.png',
      });
      return true;
    }
  } catch (error) {
    // Sin `expo-sharing` en esta build (o si falla el archivo): se cae al texto, no se rompe.
    console.warn('No se pudo compartir la imagen del pase; se comparte el texto', error);
  }
  await Share.share({ message: textoDelPase(pase) });
  return false;
}

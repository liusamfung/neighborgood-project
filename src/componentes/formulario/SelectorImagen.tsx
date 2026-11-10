/**
 * SelectorImagen: campo para adjuntar una imagen opcional elegida de la galería del teléfono.
 *
 * Qué hace: muestra una etiqueta y, según el caso, un botón "Agregar imagen" o la vista previa de la imagen
 * elegida con un botón "Quitar". Solo acepta los tipos y el tamaño que admite el bucket `avisos` de Storage
 * (JPEG, PNG o WebP de hasta 5 MB); si el archivo no cumple, muestra un mensaje en español y no lo guarda.
 * Cómo funciona: abre el selector nativo con `expo-image-picker` (iOS usa el selector del sistema, que no
 * pide permiso). En iOS se pide la representación "compatible" para que una foto HEIC llegue como JPEG, que
 * es un formato que acepta el bucket. Es un componente controlado: el padre guarda la `ImagenElegida`.
 * Se usa con: `src/app/directiva/avisos/nuevo.tsx`; lo reutilizará el reporte de incidencias (RF29).
 * Depende de: `expo-image-picker`, `expo-image`, `src/tipos/aviso.ts` (tipo `ImagenElegida`) y `src/tema`.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { colores, radios, tipografia } from '@/tema';
import type { ImagenElegida } from '@/tipos/aviso';

/** Tipos de imagen que admite el bucket `avisos` (migración 6) y la extensión con que se guardan. */
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Tamaño máximo que admite el bucket `avisos`: 5 MB. */
const MAXIMO_BYTES = 5 * 1024 * 1024;

/** Datos que recibe el selector de imagen. */
type Props = {
  /** Título del campo, por ejemplo "Imagen (opcional)". */
  etiqueta: string;
  /** Imagen elegida ahora, o `null` si no hay. */
  valor: ImagenElegida | null;
  /** Se llama con la imagen elegida o con `null` al quitarla. */
  alCambiar: (imagen: ImagenElegida | null) => void;
};

/** Campo "imagen opcional": elegir de la galería, ver la vista previa y quitar. */
export function SelectorImagen({ etiqueta, valor, alCambiar }: Props) {
  const [error, setError] = useState<string | null>(null);

  /** Abre la galería, revisa el archivo elegido y lo entrega al padre si cumple los límites. */
  async function elegir() {
    setError(null);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (resultado.canceled) return;

      const archivo = resultado.assets[0];
      const extension = archivo.mimeType ? EXTENSIONES[archivo.mimeType] : undefined;
      if (!archivo.mimeType || !extension) {
        setError('Solo se admiten imágenes JPEG, PNG o WebP.');
        return;
      }
      if (archivo.fileSize !== undefined && archivo.fileSize > MAXIMO_BYTES) {
        setError('La imagen pesa más de 5 MB. Elige una más liviana.');
        return;
      }
      alCambiar({ uri: archivo.uri, mimeType: archivo.mimeType, extension });
    } catch {
      setError('No pudimos abrir la galería. Inténtalo de nuevo.');
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {valor ? (
        <>
          <Image
            accessibilityLabel="Vista previa de la imagen adjunta"
            source={{ uri: valor.uri }}
            contentFit="cover"
            style={estilos.vistaPrevia}
          />
          <Boton
            variante="secundario"
            texto="Quitar imagen"
            alPresionar={() => {
              setError(null);
              alCambiar(null);
            }}
          />
        </>
      ) : (
        <Boton variante="secundario" texto="Agregar imagen" alPresionar={elegir} />
      )}
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 8 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  vistaPrevia: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radios.campo,
    backgroundColor: colores.suave,
  },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

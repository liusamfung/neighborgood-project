/**
 * SelectorFotos: campo para adjuntar de 1 a 3 fotos a una incidencia, con la cámara o la galería (RF29).
 *
 * Qué hace: muestra las fotos elegidas como miniaturas con un botón "Quitar" y, mientras haya menos de 3,
 * un recuadro punteado "Agregar" que ofrece "Tomar foto" o "Elegir de la galería". Solo acepta los tipos y el
 * peso que admite el bucket `incidencias` (JPEG, PNG o WebP de hasta 5 MB); si una foto no cumple, muestra
 * un mensaje en español y no la guarda.
 * Cómo funciona: abre la cámara o la galería con `expo-image-picker`. La calidad es 0.7 para que las fotos de
 * cámara quepan en 5 MB, y en iOS se pide la representación "compatible" para que una foto HEIC llegue como
 * JPEG. Es un componente controlado: el padre guarda la lista de `ImagenElegida` y valida el mínimo de 1 foto
 * (el máximo de 3 lo impone este componente y, de nuevo, la base).
 * Se usa con: `src/app/residente/incidencias/nueva.tsx` (pantalla P7).
 * Depende de: `expo-image-picker`, `expo-image`, `src/utilidades/reporteIncidencia.ts` (límites y
 * `validarFoto`), `src/tipos/aviso.ts` (tipo `ImagenElegida`) y `src/tema`. Los permisos de cámara y galería
 * ya están declarados en el plugin de `expo-image-picker` de `app.json`.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, radios, tipografia } from '@/tema';
import type { ImagenElegida } from '@/tipos/aviso';
import { MAX_FOTOS, extensionDeMime, validarFoto } from '@/utilidades/reporteIncidencia';

/** Datos que recibe el selector de fotos. */
type Props = {
  /** Fotos elegidas ahora, en el orden en que se subirán. */
  valor: ImagenElegida[];
  /** Se llama con la lista nueva al agregar o quitar una foto. */
  alCambiar: (fotos: ImagenElegida[]) => void;
  /** Mensaje de error del padre (por ejemplo, "Agrega al menos una foto."). */
  error?: string;
};

/** Opciones comunes de la cámara y la galería: calidad 0.7 y JPEG compatible en iOS. */
const OPCIONES_IMAGEN: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/** Campo "Fotos (1 a 3)": agregar con la cámara o la galería, ver las miniaturas y quitar. */
export function SelectorFotos({ valor, alCambiar, error }: Props) {
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  /**
   * Revisa la foto que devolvió el selector y, si cumple, la agrega al final de la lista.
   *
   * @param resultado lo que devolvió la cámara o la galería.
   */
  function recibir(resultado: ImagePicker.ImagePickerResult) {
    if (resultado.canceled) return;
    const archivo = resultado.assets[0];
    const problema = validarFoto(archivo.mimeType, archivo.fileSize);
    if (problema) {
      setErrorLocal(problema);
      return;
    }
    // `validarFoto` ya comprobó el tipo, así que la extensión existe.
    alCambiar([
      ...valor,
      {
        uri: archivo.uri,
        mimeType: archivo.mimeType!,
        extension: extensionDeMime(archivo.mimeType)!,
      },
    ]);
  }

  /** Abre la cámara; si el residente negó el permiso, se lo explica. */
  async function tomarFoto() {
    setErrorLocal(null);
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setErrorLocal(
          'Sin permiso de cámara. Puedes activarlo en Ajustes o elegir una foto de la galería.',
        );
        return;
      }
      recibir(await ImagePicker.launchCameraAsync(OPCIONES_IMAGEN));
    } catch {
      setErrorLocal('No pudimos abrir la cámara. Inténtalo de nuevo.');
    }
  }

  /** Abre la galería (iOS usa el selector del sistema, que no pide permiso). */
  async function elegirDeGaleria() {
    setErrorLocal(null);
    try {
      recibir(await ImagePicker.launchImageLibraryAsync(OPCIONES_IMAGEN));
    } catch {
      setErrorLocal('No pudimos abrir la galería. Inténtalo de nuevo.');
    }
  }

  /** Pregunta de dónde sacar la foto. */
  function agregar() {
    Alert.alert('Agregar foto', undefined, [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de la galería', onPress: elegirDeGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  /** Quita la foto de la posición `indice`; las demás conservan su orden. */
  function quitar(indice: number) {
    setErrorLocal(null);
    alCambiar(valor.filter((_, i) => i !== indice));
  }

  const mensaje = errorLocal ?? error;

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{`Fotos (${valor.length}/${MAX_FOTOS})`}</Text>
      <View style={estilos.fila}>
        {valor.map((foto, indice) => (
          <View key={foto.uri} style={estilos.celda}>
            <Image
              accessibilityLabel={`Foto ${indice + 1} de la incidencia`}
              source={{ uri: foto.uri }}
              contentFit="cover"
              style={estilos.miniatura}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar la foto ${indice + 1}`}
              onPress={() => quitar(indice)}
              style={estilos.quitar}
            >
              <Text style={estilos.textoQuitar}>Quitar</Text>
            </Pressable>
          </View>
        ))}
        {valor.length < MAX_FOTOS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar una foto"
            onPress={agregar}
            style={[estilos.celda, estilos.agregar]}
          >
            <Text style={estilos.textoAgregar}>+ Agregar</Text>
          </Pressable>
        ) : null}
      </View>
      {mensaje ? <Text style={estilos.error}>{mensaje}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 8 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  fila: { flexDirection: 'row', gap: 8 },
  // Ancho fijo de un tercio de la fila (menos los espacios), con o sin foto, para que no se estiren.
  celda: { width: '31.5%', gap: 6 },
  miniatura: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radios.campo,
    backgroundColor: colores.suave,
  },
  quitar: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textoQuitar: { ...tipografia.cuerpo, color: colores.peligroTexto },
  agregar: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colores.bordeCampo,
    borderRadius: radios.campo,
  },
  textoAgregar: { ...tipografia.subtitulo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

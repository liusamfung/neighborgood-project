/**
 * CampoTexto: campo de texto con etiqueta para los formularios.
 *
 * Qué hace: muestra una etiqueta y un `TextInput` con el estilo del sistema de diseño; es accesible
 * porque la etiqueta también se usa como `accessibilityLabel`.
 * Se usa con: `src/app/(auth)/login.tsx` (correo y contraseña); lo usarán los formularios de RF1, RF4 y RF5.
 * Depende de: `src/tema` (colores, radios, tamaños y tipografía).
 */
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

/**
 * Acepta todas las props de `TextInput` (valor, teclado, autocompletado...) menos `style`, que fija
 * el tema, y añade la etiqueta.
 */
type Props = Omit<TextInputProps, 'style'> & {
  /** Texto que se muestra encima del campo; también lo lee el lector de pantalla. */
  etiqueta: string;
};

/**
 * Campo de texto con su etiqueta encima (DISENO.md: radio 12, borde gris, 56 px de alto).
 * `...resto` pasa al `TextInput` todas las demás props, como `value` y `onChangeText`.
 */
export function CampoTexto({ etiqueta, ...resto }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoSecundario}
        style={estilos.campo}
        {...resto}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  campo: {
    ...tipografia.subtitulo,
    minHeight: tamanos.alturaBoton,
    paddingHorizontal: 16,
    color: colores.texto,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    borderRadius: radios.campo,
  },
});

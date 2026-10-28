import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

type Props = Omit<TextInputProps, 'style'> & {
  etiqueta: string;
};

/** Campo de texto con su etiqueta encima (DISENO.md: radio 12, borde gris, 56 px de alto). */
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

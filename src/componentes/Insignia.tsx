/**
 * Insignia: etiqueta pequeña de color para marcar un estado, como "Obligatoria" (RF14).
 *
 * Qué hace: dibuja un texto corto dentro de una píldora con el par de colores (fondo y texto) que
 * recibe, para que cada pantalla use los pares definidos en el tema y no colores sueltos.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (encuestas obligatorias).
 * Depende de: `src/tema` (radios y tipografía).
 */
import { StyleSheet, Text, View } from 'react-native';

import { radios, tipografia } from '@/tema';

/** Datos de la insignia: el texto y su par de colores. */
type Props = {
  texto: string;
  colores: { fondo: string; texto: string };
};

/** Píldora de color con un texto corto; los lectores de pantalla la leen como texto normal. */
export function Insignia({ texto, colores }: Props) {
  return (
    <View style={[estilos.pildora, { backgroundColor: colores.fondo }]}>
      <Text style={[estilos.texto, { color: colores.texto }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pildora: {
    alignSelf: 'flex-start',
    borderRadius: radios.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  texto: { ...tipografia.cuerpo, fontSize: 12 },
});

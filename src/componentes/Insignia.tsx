/**
 * Insignia: etiqueta pequeña y redondeada (chip) para mostrar un estado o una categoría.
 *
 * Qué hace: dibuja un texto corto sobre un fondo de color, con el radio total del sistema de diseño.
 * Los pares de colores (fondo y texto) salen de `src/tema/colores.ts` (`chipsPase`, `chipsIncidencia`...).
 * Se usa con: las tarjetas de avisos y encuestas, la pantalla de Visitas (P6) y la del guardia (P11).
 * Depende de: `src/tema`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colores, radios, tipografia } from '@/tema';

/** Datos que recibe la insignia. */
type Props = {
  texto: string;
  /** Par de colores; por defecto, teal suave con texto teal (categorías). */
  color?: { fondo: string; texto: string };
};

/** Chip de solo lectura con un texto corto. */
export function Insignia({
  texto,
  color = { fondo: colores.suave, texto: colores.principal },
}: Props) {
  return (
    <View style={[estilos.chip, { backgroundColor: color.fondo }]}>
      <Text style={[estilos.texto, { color: color.texto }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radios.chip,
  },
  texto: tipografia.etiqueta,
});

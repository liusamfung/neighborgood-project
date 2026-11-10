/**
 * Interruptor: fila con un texto y un interruptor de encendido y apagado para los formularios.
 *
 * Qué hace: muestra una etiqueta (y una ayuda opcional) junto a un `Switch` con los colores del sistema
 * de diseño. Toda la fila mide al menos 56 px de alto para cumplir el área táctil de RNF8.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx` ("Encuesta obligatoria", "Resultados en vivo") y
 * `src/componentes/encuestas/TarjetaPregunta.tsx` ("Varias respuestas").
 * Depende de: `src/tema` (colores, tamaños y tipografía).
 */
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colores, tamanos, tipografia } from '@/tema';

/** Datos que recibe el interruptor. */
type Props = {
  /** Texto principal de la fila; también lo lee el lector de pantalla. */
  etiqueta: string;
  /** Explicación corta debajo de la etiqueta (opcional). */
  ayuda?: string;
  valor: boolean;
  alCambiar: (valor: boolean) => void;
};

/** Fila "etiqueta + interruptor". El texto queda a la izquierda y el interruptor a la derecha. */
export function Interruptor({ etiqueta, ayuda, valor, alCambiar }: Props) {
  return (
    <View style={estilos.fila}>
      <View style={estilos.textos}>
        <Text style={estilos.etiqueta}>{etiqueta}</Text>
        {ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={etiqueta}
        value={valor}
        onValueChange={alCambiar}
        trackColor={{ false: colores.bordeCampo, true: colores.principal }}
        thumbColor={colores.superficie}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: tamanos.alturaBoton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textos: { flex: 1, gap: 2 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  ayuda: { ...tipografia.cuerpo, color: colores.textoSecundario },
});

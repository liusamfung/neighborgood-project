/**
 * Pregunta publicada de P5: opciones accesibles como radio o casilla según el modelo.
 * La pantalla conserva el borrador y aplica las reglas; este componente solo presenta y avisa.
 * Reutiliza tamaños, tipografía y colores del tema, sin consultas ni dependencias nativas nuevas.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';
import type { PreguntaVotacion } from '@/tipos/votacion';

/** Presentación controlada de las respuestas seleccionadas para una pregunta. */
type Props = {
  pregunta: PreguntaVotacion;
  indice: number;
  elegidas: string[];
  bloqueada: boolean;
  alElegir: (id: string) => void;
};

/** Distingue selección única/múltiple y mantiene al menos 44 px de área táctil. */
export function PreguntaVoto({ pregunta, indice, elegidas, bloqueada, alElegir }: Props) {
  const unica = pregunta.seleccion === 'unica';
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.indicacion}>
        PREGUNTA {indice + 1} · {unica ? 'ELIGE UNA' : 'ELIGE UNA O MÁS'}
      </Text>
      <Text accessibilityRole="header" style={estilos.titulo}>
        {pregunta.texto}
      </Text>
      {pregunta.opciones.map((opcion) => {
        const marcada = elegidas.includes(opcion.id);
        return (
          <Pressable
            key={opcion.id}
            accessibilityRole={unica ? 'radio' : 'checkbox'}
            accessibilityState={{ checked: marcada, disabled: bloqueada }}
            disabled={bloqueada}
            onPress={() => alElegir(opcion.id)}
            style={[estilos.opcion, marcada && estilos.marcada]}
          >
            <Text aria-hidden style={estilos.simbolo}>
              {unica ? (marcada ? '●' : '○') : marcada ? '☑' : '☐'}
            </Text>
            <Text style={estilos.texto}>{opcion.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.superficie,
  },
  indicacion: { ...tipografia.cuerpo, color: colores.principal },
  titulo: { ...tipografia.subtitulo, color: colores.texto },
  opcion: {
    minHeight: tamanos.areaTactilMinima,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 8,
  },
  marcada: { backgroundColor: colores.suave },
  simbolo: { fontSize: 24, color: colores.principal },
  texto: { ...tipografia.cuerpo, color: colores.texto, flex: 1 },
});

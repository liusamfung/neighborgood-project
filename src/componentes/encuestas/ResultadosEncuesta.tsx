/**
 * ResultadosEncuesta: los votos de una encuesta, pregunta por pregunta, con barras (RF12).
 *
 * Qué hace: por cada opción muestra su texto, cuántos votos tiene, el porcentaje y una barra
 * proporcional. El porcentaje se calcula sobre los votos de la pregunta; en una pregunta de selección
 * múltiple una unidad puede marcar varias opciones, así que los porcentajes pueden sumar más de 100.
 * Se usa con: `src/app/residente/encuesta/[id].tsx` (P5) y
 * `src/app/directiva/encuestas/[id]/resultados.tsx` (P14b).
 * Depende de: los tipos de `src/repositorios/encuestas.ts` y el tema.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { ConteoOpcion, PreguntaEncuesta } from '@/repositorios/encuestas';
import { colores, radios, sombras, tipografia } from '@/tema';

/** Datos que recibe el componente. */
type Props = {
  preguntas: PreguntaEncuesta[];
  /** Conteo por opción que devuelve la función SQL `resultados_encuesta`. */
  conteos: ConteoOpcion[];
};

/** Lista de preguntas con una barra de resultado por opción. */
export function ResultadosEncuesta({ preguntas, conteos }: Props) {
  // Acceso rápido: id de la opción → cantidad de votos.
  const totalPorOpcion = new Map(conteos.map((c) => [c.opcion_id, Number(c.total)]));

  return (
    <View style={estilos.contenedor}>
      {preguntas.map((pregunta) => {
        const totalPregunta = pregunta.encuesta_opciones.reduce(
          (suma, opcion) => suma + (totalPorOpcion.get(opcion.id) ?? 0),
          0,
        );
        return (
          <View key={pregunta.id} style={estilos.pregunta}>
            <Text style={estilos.textoPregunta}>{pregunta.texto}</Text>
            {pregunta.encuesta_opciones.map((opcion) => {
              const votos = totalPorOpcion.get(opcion.id) ?? 0;
              const porcentaje = totalPregunta ? Math.round((votos * 100) / totalPregunta) : 0;
              return (
                <View key={opcion.id} style={estilos.opcion}>
                  <View style={estilos.filaOpcion}>
                    <Text style={[estilos.textoOpcion, estilos.flexible]}>{opcion.texto}</Text>
                    <Text style={estilos.cifra}>
                      {votos} · {porcentaje}%
                    </Text>
                  </View>
                  <View style={estilos.pista}>
                    <View style={[estilos.barra, { width: `${porcentaje}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 12 },
  pregunta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 10,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  textoPregunta: { ...tipografia.subtitulo, color: colores.texto },
  opcion: { gap: 4 },
  filaOpcion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexible: { flex: 1 },
  textoOpcion: { ...tipografia.cuerpo, color: colores.texto },
  cifra: { ...tipografia.subtitulo, fontSize: 14, color: colores.principal },
  // La pista es el fondo gris de la barra; la barra teal ocupa el porcentaje de votos.
  pista: { height: 8, borderRadius: radios.chip, backgroundColor: colores.borde },
  barra: { height: 8, borderRadius: radios.chip, backgroundColor: colores.principal },
});

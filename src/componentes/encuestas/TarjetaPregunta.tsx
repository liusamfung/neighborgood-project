/**
 * TarjetaPregunta: tarjeta para escribir una pregunta de la encuesta con sus opciones (P14).
 *
 * Qué hace: muestra el texto de la pregunta, una lista de opciones que se pueden agregar y quitar, y el
 * interruptor "Varias respuestas" (selección múltiple en lugar de única). Muestra los errores de
 * validación que le pasa el padre.
 * Cómo funciona: es un componente controlado. No guarda nada: recibe la pregunta y devuelve una copia
 * modificada con `alCambiar`; la pantalla es quien guarda el borrador completo.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx`.
 * Depende de: `CampoTexto` e `Interruptor` (`src/componentes/formulario/`), `nuevaOpcion`
 * (`src/utilidades/borradorEncuesta.ts`), los tipos de `src/tipos/encuesta.ts` y `src/tema`.
 */
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { Interruptor } from '@/componentes/formulario/Interruptor';
import { colores, radios, tamanos, tipografia } from '@/tema';
import type { BorradorPregunta } from '@/tipos/encuesta';
import { nuevaOpcion } from '@/utilidades/borradorEncuesta';

/** Datos que recibe la tarjeta. */
type Props = {
  /** Posición de la pregunta (1, 2, ...), solo para el título "PREGUNTA 1". */
  numero: number;
  pregunta: BorradorPregunta;
  /** Se llama con la pregunta ya modificada. */
  alCambiar: (pregunta: BorradorPregunta) => void;
  /** Si es null, no se muestra "Quitar" (no se puede dejar la encuesta sin preguntas). */
  alQuitar: (() => void) | null;
  /** Errores de esta pregunta (texto de la pregunta y cantidad de opciones). */
  errores?: { texto?: string; opciones?: string };
};

/** Mínimo de opciones que acepta la base de datos: no se puede quitar por debajo de este número. */
const MIN_OPCIONES = 2;

/** Tarjeta de una pregunta: texto, opciones y tipo de selección. */
export function TarjetaPregunta({ numero, pregunta, alCambiar, alQuitar, errores }: Props) {
  /** Cambia el texto de una opción sin tocar las demás. */
  function cambiarOpcion(clave: string, texto: string) {
    alCambiar({
      ...pregunta,
      opciones: pregunta.opciones.map((o) => (o.clave === clave ? { ...o, texto } : o)),
    });
  }

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>Pregunta {numero}</Text>
        {alQuitar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar la pregunta ${numero}`}
            onPress={alQuitar}
            style={estilos.accion}
          >
            <Text style={estilos.textoPeligro}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>

      <CampoTexto
        etiqueta="Pregunta"
        placeholder="Escribe la pregunta"
        value={pregunta.texto}
        onChangeText={(texto) => alCambiar({ ...pregunta, texto })}
      />
      {errores?.texto ? <Text style={estilos.error}>{errores.texto}</Text> : null}

      {pregunta.opciones.map((opcion, indice) => (
        <View key={opcion.clave} style={estilos.opcion}>
          <View style={estilos.campoOpcion}>
            <CampoTexto
              etiqueta={`Opción ${indice + 1}`}
              placeholder="Escribe la opción"
              value={opcion.texto}
              onChangeText={(texto) => cambiarOpcion(opcion.clave, texto)}
            />
          </View>
          {pregunta.opciones.length > MIN_OPCIONES ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar la opción ${indice + 1}`}
              onPress={() =>
                alCambiar({
                  ...pregunta,
                  opciones: pregunta.opciones.filter((o) => o.clave !== opcion.clave),
                })
              }
              style={estilos.quitarOpcion}
            >
              <Feather name="x" size={20} color={colores.textoSecundario} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {errores?.opciones ? <Text style={estilos.error}>{errores.opciones}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => alCambiar({ ...pregunta, opciones: [...pregunta.opciones, nuevaOpcion()] })}
        style={estilos.accion}
      >
        <Text style={estilos.textoAccion}>+ Agregar opción</Text>
      </Pressable>

      <Interruptor
        etiqueta="Varias respuestas"
        ayuda="El residente podrá marcar más de una opción."
        valor={pregunta.seleccion === 'multiple'}
        alCambiar={(multiple) =>
          alCambiar({ ...pregunta, seleccion: multiple ? 'multiple' : 'unica' })
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: 12,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { ...tipografia.etiqueta, color: colores.principal },
  accion: { minHeight: tamanos.areaTactilMinima, justifyContent: 'center' },
  textoAccion: { ...tipografia.subtitulo, color: colores.principal },
  textoPeligro: { ...tipografia.subtitulo, color: colores.peligroTexto },
  // El botón de quitar se alinea con el campo (56 px) y no con su etiqueta.
  opcion: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  campoOpcion: { flex: 1 },
  quitarOpcion: {
    width: tamanos.alturaBoton,
    height: tamanos.alturaBoton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

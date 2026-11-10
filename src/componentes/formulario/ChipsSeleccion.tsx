/**
 * ChipsSeleccion: grupo de chips para elegir una opción o varias de una lista corta.
 *
 * Qué hace: dibuja una etiqueta y una fila de chips con el estilo del sistema de diseño (radio total,
 * seleccionado en teal suave). Sirve para la categoría (una sola) y para los sectores (varios).
 * Cómo funciona: el padre guarda los ids seleccionados; este componente solo dibuja y avisa cada cambio.
 * Con `textoVacio` agrega un primer chip que representa "ninguno elegido" (por ejemplo "Todo el
 * condominio"): se ve activo cuando no hay ids seleccionados y, al tocarlo, los limpia.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx` (categoría y "Dirigida a"); lo usará el aviso (RF7).
 * Depende de: `src/tema` (colores, radios, tamaños y tipografía).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

/** Datos que recibe el grupo de chips. */
type Props = {
  /** Título del grupo, por ejemplo "Categoría". */
  etiqueta: string;
  /** Opciones disponibles: `id` es lo que se guarda y `texto` lo que ve el usuario. */
  opciones: { id: string; texto: string }[];
  /** Ids elegidos ahora. */
  seleccionados: string[];
  /** Se llama con la lista completa de ids elegidos después de cada toque. */
  alCambiar: (ids: string[]) => void;
  /** true permite elegir varios; false (por defecto) reemplaza la elección anterior. */
  multiple?: boolean;
  /** Si se indica, agrega un chip inicial que equivale a no haber elegido ninguno. */
  textoVacio?: string;
  /** Mensaje de error que se muestra debajo del grupo. */
  error?: string;
};

/** Grupo de chips con etiqueta; accesible como botones con estado "seleccionado". */
export function ChipsSeleccion({
  etiqueta,
  opciones,
  seleccionados,
  alCambiar,
  multiple = false,
  textoVacio,
  error,
}: Props) {
  /** Aplica un toque sobre una opción: alterna en modo múltiple y reemplaza en modo único. */
  function alternar(id: string) {
    if (!multiple) return alCambiar([id]);
    alCambiar(
      seleccionados.includes(id) ? seleccionados.filter((s) => s !== id) : [...seleccionados, id],
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.chips}>
        {textoVacio ? (
          <Chip
            texto={textoVacio}
            activo={seleccionados.length === 0}
            alPresionar={() => alCambiar([])}
          />
        ) : null}
        {opciones.map((opcion) => (
          <Chip
            key={opcion.id}
            texto={opcion.texto}
            activo={seleccionados.includes(opcion.id)}
            alPresionar={() => alternar(opcion.id)}
          />
        ))}
      </View>
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

/** Un chip: botón redondeado con el texto; teal suave con borde teal si está activo. */
function Chip({
  texto,
  activo,
  alPresionar,
}: {
  texto: string;
  activo: boolean;
  alPresionar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={alPresionar}
      style={[estilos.chip, activo && estilos.chipActivo]}
    >
      <Text style={[estilos.textoChip, activo && estilos.textoChipActivo]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 8 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: tamanos.areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    borderRadius: radios.chip,
  },
  chipActivo: { backgroundColor: colores.suave, borderColor: colores.principal },
  textoChip: { ...tipografia.cuerpo, color: colores.texto },
  textoChipActivo: { color: colores.principal, fontFamily: tipografia.subtitulo.fontFamily },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

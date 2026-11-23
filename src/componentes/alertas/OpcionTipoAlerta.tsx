/**
 * OpcionTipoAlerta: una fila elegible de la pantalla "Enviar alerta" (P3), como en el mockup.
 *
 * Qué hace: muestra un tipo de alerta con su ícono sobre el color del tipo, su título, su descripción
 * y una marca redonda que se rellena cuando está elegido. Al elegirse, el borde y un fondo suave toman el
 * color del tipo (rojo la médica, naranja el incendio, índigo la seguridad).
 * Se usa con: `src/app/residente/alerta/tipo.tsx` (una fila por cada tipo de `TIPOS_ALERTA`).
 * Depende de: `src/tema` (`coloresAlerta`, colores y radios) y `@expo/vector-icons` (Ionicons).
 * Accesibilidad: es un botón de radio (`accessibilityRole="radio"`) y mide más de 72 px de alto (RNF8).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { coloresAlerta, colores, radios, tipografia } from '@/tema';
import type { TipoAlerta } from '@/tipos/alerta';
import type { IconoAlerta } from '@/utilidades/alertaEmergencia';

/** Datos que recibe la opción. */
type Props = {
  /** Tipo de alerta de la base; define el color. */
  tipo: TipoAlerta;
  /** Título corto, por ejemplo "Médica". */
  titulo: string;
  /** Frase que explica cuándo usar ese tipo. */
  descripcion: string;
  /** Nombre del ícono de Ionicons. */
  icono: IconoAlerta;
  /** true si es el tipo elegido en este momento. */
  seleccionado: boolean;
  /** Se llama al tocar la fila para elegir este tipo. */
  alPresionar: () => void;
};

/** Fila de un tipo de alerta; la pantalla P3 muestra tres y deja una elegida. */
export function OpcionTipoAlerta({
  tipo,
  titulo,
  descripcion,
  icono,
  seleccionado,
  alPresionar,
}: Props) {
  const color = coloresAlerta[tipo];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`${titulo}. ${descripcion}`}
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.fila,
        // `14` en hexadecimal es un 8 % de opacidad: un fondo apenas teñido del color del tipo.
        seleccionado && { borderColor: color, backgroundColor: `${color}14` },
        pressed && estilos.presionada,
      ]}
    >
      <View style={[estilos.icono, { backgroundColor: color }]}>
        <Ionicons name={icono} size={26} color={colores.superficie} />
      </View>
      <View style={estilos.textos}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.descripcion}>{descripcion}</Text>
      </View>
      <View style={[estilos.marca, seleccionado && { backgroundColor: color, borderColor: color }]}>
        {seleccionado ? <Ionicons name="checkmark" size={18} color={colores.superficie} /> : null}
      </View>
    </Pressable>
  );
}

// Fila con borde de 2 px (gris si no está elegida) para que no "salte" de tamaño al elegirla.
const estilos = StyleSheet.create({
  fila: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  presionada: { opacity: 0.85 },
  icono: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radios.campo,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { ...tipografia.subtitulo, color: colores.texto },
  descripcion: { ...tipografia.cuerpo, color: colores.textoSecundario },
  marca: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radios.chip,
    borderWidth: 2,
    borderColor: colores.bordeCampo,
  },
});

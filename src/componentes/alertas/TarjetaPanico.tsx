/**
 * TarjetaPanico: la tarjeta roja del botón de pánico de la pantalla Inicio (P2), como en el mockup.
 *
 * Qué hace: muestra un escudo, el título "Botón de pánico", una línea de ayuda y un botón blanco ancho
 * "Enviar alerta de emergencia". Tocarlo es el primer toque de los tres que permite RNF4
 * (Inicio → elegir tipo → confirmar).
 * Se usa con: `src/app/residente/(tabs)/index.tsx`, que lo conecta con la ruta `/residente/alerta/tipo`.
 * Depende de: `src/tema` (color de emergencia, radios, tamaños y tipografía) y `@expo/vector-icons`.
 * Accesibilidad: el botón mide 56 px de alto y tiene etiqueta propia para lectores de pantalla (RNF8).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

/** Datos que recibe la tarjeta. */
type Props = {
  /** Se llama al tocar "Enviar alerta de emergencia" (la pantalla navega a elegir el tipo). */
  alPresionar: () => void;
};

/** Tarjeta roja con el botón de pánico; no envía nada por sí misma: solo abre la elección del tipo. */
export function TarjetaPanico({ alPresionar }: Props) {
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.encabezado}>
        <View style={estilos.circulo}>
          <Ionicons name="shield" size={34} color={colores.emergencia} />
        </View>
        <View style={estilos.textos}>
          <Text style={estilos.titulo}>Botón de pánico</Text>
          <Text style={estilos.ayuda}>Avisa a la guardia y a tus vecinos</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar alerta de emergencia"
        onPress={alPresionar}
        style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
      >
        <Text style={estilos.textoBoton}>Enviar alerta de emergencia</Text>
      </Pressable>
    </View>
  );
}

// Fondo rojo de emergencia; el botón es blanco con texto rojo oscuro para que se lea bien (contraste).
const estilos = StyleSheet.create({
  tarjeta: {
    gap: 16,
    padding: 20,
    backgroundColor: colores.emergencia,
    borderRadius: radios.tarjeta,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circulo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radios.chip,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { ...tipografia.titulo, color: colores.superficie },
  ayuda: { ...tipografia.cuerpo, color: colores.superficie },
  boton: {
    minHeight: tamanos.alturaBoton,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radios.boton,
  },
  presionado: { opacity: 0.85 },
  textoBoton: { ...tipografia.subtitulo, color: colores.peligroTexto },
});

/**
 * EstadoVacio: lo que se muestra cuando una lista no tiene nada (sin avisos, sin pases, sin contactos).
 *
 * Qué hace: dibuja un círculo suave con un emoji (o un ícono Feather) y un mensaje centrado, en vez
 * de una línea de texto suelta, para que la pantalla vacía no parezca rota.
 * Se usa con: las listas de avisos, encuestas, pases, visitas de hoy, contactos y residentes, y las
 * pantallas de inicio.
 * Depende de: `IconoCuadro` y `src/tema`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { IconoCuadro, type NombreIcono } from '@/componentes/IconoCuadro';
import { colores, tipografia } from '@/tema';

/** Datos que recibe el estado vacío: lleva un emoji o, si no, un ícono. */
type Props = {
  /** Emoji que se dibuja grande dentro del círculo, por ejemplo "📭". Tiene prioridad sobre `icono`. */
  emoji?: string;
  /** Ícono Feather que se usa cuando no hay emoji. */
  icono?: NombreIcono;
  /** Mensaje corto, por ejemplo "No hay avisos vigentes." */
  mensaje: string;
};

/** Círculo con emoji o ícono y un mensaje centrado. */
export function EstadoVacio({ emoji, icono = 'inbox', mensaje }: Props) {
  return (
    <View style={estilos.contenedor}>
      {emoji ? (
        // El emoji es decorativo: el lector de pantalla lee solo el mensaje.
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={estilos.circulo}
        >
          <Text style={estilos.emoji}>{emoji}</Text>
        </View>
      ) : (
        <IconoCuadro icono={icono} tamano={72} redondo />
      )}
      <Text style={estilos.mensaje}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 16 },
  circulo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.suave,
  },
  emoji: { fontSize: 34 },
  mensaje: { ...tipografia.cuerpo, textAlign: 'center', color: colores.textoSecundario },
});

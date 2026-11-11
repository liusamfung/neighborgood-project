/**
 * EstadoVacio: lo que se muestra cuando una lista no tiene nada (sin avisos, sin pases, sin contactos).
 *
 * Qué hace: dibuja un ícono grande y suave con un mensaje centrado, en vez de una línea de texto
 * suelta, para que la pantalla vacía no parezca rota.
 * Se usa con: las listas de avisos, encuestas, pases, visitas de hoy, contactos y residentes.
 * Depende de: `IconoCuadro` y `src/tema`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { IconoCuadro, type NombreIcono } from '@/componentes/IconoCuadro';
import { colores, tipografia } from '@/tema';

/** Datos que recibe el estado vacío. */
type Props = {
  icono: NombreIcono;
  /** Mensaje corto, por ejemplo "No hay avisos vigentes." */
  mensaje: string;
};

/** Ícono redondo y mensaje centrados. */
export function EstadoVacio({ icono, mensaje }: Props) {
  return (
    <View style={estilos.contenedor}>
      <IconoCuadro icono={icono} tamano={64} redondo />
      <Text style={estilos.mensaje}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 16 },
  mensaje: { ...tipografia.cuerpo, textAlign: 'center', color: colores.textoSecundario },
});

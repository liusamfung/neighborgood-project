/**
 * IconoCuadro: un ícono dentro de un cuadro redondeado de color suave, como en los mockups.
 *
 * Qué hace: dibuja el cuadro teal suave con un ícono Feather que abre cada tarjeta (avisos, pases,
 * contactos, residentes). También sirve en grande y redondo, por ejemplo para el resultado del escáner.
 * Se usa con: `TarjetaAviso`, `TarjetaEncuesta`, `EstadoVacio` y las pantallas de Perfil, Visitas,
 * Escáner y Residentes.
 * Depende de: `@expo/vector-icons` (Feather, trazo de 2 px según DISENO.md) y `src/tema`.
 */
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colores } from '@/tema';

/** Nombre de un ícono de la familia Feather (por ejemplo "bell" o "shield"). */
export type NombreIcono = ComponentProps<typeof Feather>['name'];

/** Datos que recibe el cuadro. */
type Props = {
  icono: NombreIcono;
  /** Lado del cuadro en px; el ícono ocupa la mitad. Por defecto 44. */
  tamano?: number;
  /** Par de colores; por defecto, fondo teal suave e ícono teal. */
  color?: { fondo: string; texto: string };
  /** true lo dibuja como círculo en vez de cuadro redondeado. */
  redondo?: boolean;
};

/** Cuadro (o círculo) de color con un ícono centrado. Es decorativo: los lectores de pantalla lo omiten. */
export function IconoCuadro({
  icono,
  tamano = 44,
  color = { fondo: colores.suave, texto: colores.principal },
  redondo = false,
}: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        estilos.cuadro,
        {
          width: tamano,
          height: tamano,
          borderRadius: redondo ? tamano / 2 : 12,
          backgroundColor: color.fondo,
        },
      ]}
    >
      <Feather name={icono} size={Math.round(tamano / 2)} color={color.texto} />
    </View>
  );
}

const estilos = StyleSheet.create({
  cuadro: { alignItems: 'center', justifyContent: 'center' },
});

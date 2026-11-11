/**
 * Boton: botón reutilizable de la app (primario sólido, secundario con contorno o de peligro).
 *
 * Qué hace: dibuja un botón con los colores y tamaños del sistema de diseño, con un ícono opcional a
 * la izquierda del texto y los estados "cargando" (muestra un indicador y bloquea el toque) y
 * "deshabilitado".
 * Se usa con: `src/app/(auth)/login.tsx`, `src/app/(auth)/registro.tsx`, las pantallas de
 * `src/app/directiva`, `src/app/residente` y `src/app/guardia`, y `src/componentes/PantallaMarcador.tsx`
 * (Cerrar sesión).
 * Depende de: `src/tema` (colores, radios, tamaños y tipografía) y de los íconos Feather.
 */
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

/** Datos que recibe el botón. */
type Props = {
  /** Texto visible del botón. */
  texto: string;
  /** Función que se ejecuta al tocar el botón. */
  alPresionar: () => void;
  /**
   * "primario" es el botón teal sólido; "secundario" es el contorno teal; "peligro" es el contorno
   * rojo de las acciones que no se deshacen, como anular un pase o cerrar sesión (DISENO.md).
   */
  variante?: 'primario' | 'secundario' | 'peligro';
  /** Ícono Feather opcional a la izquierda del texto (por ejemplo "share" o "plus"). */
  icono?: ComponentProps<typeof Feather>['name'];
  /** Si es true, el botón se ve gris y no responde al toque. */
  deshabilitado?: boolean;
  /** Muestra un indicador y bloquea el botón mientras se espera una respuesta. */
  cargando?: boolean;
};

/**
 * Botón de la app, con estados deshabilitado y cargando.
 * Mide 56 px de alto (`tamanos.alturaBoton`) para cumplir el área táctil de RNF8.
 */
export function Boton({
  texto,
  alPresionar,
  variante = 'primario',
  icono,
  deshabilitado,
  cargando,
}: Props) {
  // Cargando también bloquea el botón: así no se envía dos veces la misma acción.
  const inactivo = Boolean(deshabilitado || cargando);
  // Color del texto y del ícono: gris si está inactivo; si no, el de su variante.
  const colorTexto = inactivo
    ? colores.textoSecundario
    : variante === 'primario'
      ? colores.superficie
      : variante === 'peligro'
        ? colores.peligroTexto
        : colores.principal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: Boolean(cargando) }}
      disabled={inactivo}
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.base,
        estilos[variante],
        inactivo && estilos.inactivo,
        pressed && estilos.presionado,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <>
          {icono ? <Feather name={icono} size={20} color={colorTexto} /> : null}
          <Text style={[estilos.texto, { color: colorTexto }]}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

// Un estilo por variante y por estado; se combinan en `style` según las props.
const estilos = StyleSheet.create({
  base: {
    minHeight: tamanos.alturaBoton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radios.boton,
    borderWidth: 2,
  },
  primario: { backgroundColor: colores.principal, borderColor: colores.principal },
  secundario: { backgroundColor: colores.superficie, borderColor: colores.principal },
  peligro: { backgroundColor: colores.superficie, borderColor: colores.peligroBorde },
  inactivo: { backgroundColor: colores.borde, borderColor: colores.borde },
  presionado: { opacity: 0.85 },
  texto: tipografia.subtitulo,
});

/**
 * Boton: botón reutilizable de la app (variante primaria sólida o secundaria con contorno).
 *
 * Qué hace: dibuja un botón con los colores y tamaños del sistema de diseño, con estado "cargando"
 * (muestra un indicador y bloquea el toque) y "deshabilitado".
 * Se usa con: `src/app/(auth)/login.tsx`, `src/app/(auth)/registro.tsx`, las pantallas de
 * `src/app/directiva/residentes` y `src/componentes/PantallaMarcador.tsx`
 * (Cerrar sesión); lo usarán también los formularios de RF1, RF4 y RF5.
 * Depende de: `src/tema` (colores, radios, tamaños y tipografía).
 */
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

/** Datos que recibe el botón. */
type Props = {
  /** Texto visible del botón. */
  texto: string;
  /** Función que se ejecuta al tocar el botón. */
  alPresionar: () => void;
  /** "primario" es el botón teal sólido; "secundario" es el contorno teal (DISENO.md). */
  variante?: 'primario' | 'secundario';
  /** Si es true, el botón se ve gris y no responde al toque. */
  deshabilitado?: boolean;
  /** Muestra un indicador y bloquea el botón mientras se espera una respuesta. */
  cargando?: boolean;
};

/**
 * Botón principal o secundario de la app, con estados deshabilitado y cargando.
 * Mide 56 px de alto (`tamanos.alturaBoton`) para cumplir el área táctil de RNF8.
 */
export function Boton({
  texto,
  alPresionar,
  variante = 'primario',
  deshabilitado,
  cargando,
}: Props) {
  // Cargando también bloquea el botón: así no se envía dos veces la misma acción.
  const inactivo = Boolean(deshabilitado || cargando);
  const primario = variante === 'primario';
  // Color del texto: gris si está inactivo; blanco sobre el primario; teal sobre el secundario.
  const colorTexto = inactivo
    ? colores.textoSecundario
    : primario
      ? colores.superficie
      : colores.principal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: Boolean(cargando) }}
      disabled={inactivo}
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.base,
        primario ? estilos.primario : estilos.secundario,
        inactivo && estilos.inactivo,
        pressed && estilos.presionado,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Text style={[estilos.texto, { color: colorTexto }]}>{texto}</Text>
      )}
    </Pressable>
  );
}

// Un estilo por variante y por estado; se combinan en `style` según las props.
const estilos = StyleSheet.create({
  base: {
    minHeight: tamanos.alturaBoton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radios.boton,
    borderWidth: 2,
  },
  primario: { backgroundColor: colores.principal, borderColor: colores.principal },
  secundario: { backgroundColor: colores.superficie, borderColor: colores.principal },
  inactivo: { backgroundColor: colores.borde, borderColor: colores.borde },
  presionado: { opacity: 0.85 },
  texto: tipografia.subtitulo,
});

import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

type Props = {
  texto: string;
  alPresionar: () => void;
  /** "primario" es el botón teal sólido; "secundario" es el contorno teal (DISENO.md). */
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
  /** Muestra un indicador y bloquea el botón mientras se espera una respuesta. */
  cargando?: boolean;
};

export function Boton({
  texto,
  alPresionar,
  variante = 'primario',
  deshabilitado,
  cargando,
}: Props) {
  const inactivo = Boolean(deshabilitado || cargando);
  const primario = variante === 'primario';
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

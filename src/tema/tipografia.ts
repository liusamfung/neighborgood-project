/**
 * Tipografía del sistema de diseño (fuente Inter, ver docs/design/DISENO.md).
 *
 * Se usa con: los componentes de `src/componentes` y las pantallas, mediante '@/tema'.
 * Depende de: las fuentes que `src/app/_layout.tsx` carga con `@expo-google-fonts/inter`.
 */
import type { TextStyle } from 'react-native';

/** Nombres de las fuentes Inter, tal como las registra `useFonts` en `src/app/_layout.tsx`. */
export const fuentes = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Estilos de texto de la app (familia, tamaño y peso). Se esparcen en un `StyleSheet`:
 * `{ ...tipografia.titulo, color: colores.texto }`.
 */
export const tipografia = {
  titulo: { fontFamily: fuentes.bold, fontSize: 22 },
  subtitulo: { fontFamily: fuentes.semibold, fontSize: 16 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 14 },
  etiqueta: {
    fontFamily: fuentes.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>; // `satisfies` valida que sean estilos de React Native sin perder los valores exactos

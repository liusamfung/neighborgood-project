import type { TextStyle } from 'react-native';

// Nombres de las fuentes cargadas con @expo-google-fonts/inter (ver src/app/_layout.tsx).
export const fuentes = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const tipografia = {
  titulo: { fontFamily: fuentes.bold, fontSize: 22 },
  subtitulo: { fontFamily: fuentes.semibold, fontSize: 16 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 14 },
  etiqueta: {
    fontFamily: fuentes.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

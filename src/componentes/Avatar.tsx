/**
 * Avatar: círculo con las iniciales del usuario, como en los mockups (P2, P8 y P12).
 *
 * Qué hace: toma el nombre y el apellido del perfil y dibuja sus iniciales en un círculo teal suave.
 * No usa fotos: la app no guarda foto de perfil.
 * Se usa con: `src/app/residente/(tabs)/index.tsx` (Inicio), `src/app/residente/(tabs)/perfil.tsx`
 * (Perfil) y `src/app/directiva/(tabs)/index.tsx` (Panel).
 * Depende de: `src/tema`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colores, fuentes } from '@/tema';

/** Datos que recibe el avatar. */
type Props = {
  nombre?: string | null;
  apellido?: string | null;
  /** Diámetro del círculo en px; la letra ocupa un tercio. Por defecto 44. */
  tamano?: number;
};

/** Círculo con las dos iniciales (nombre y apellido) en mayúsculas. */
export function Avatar({ nombre, apellido, tamano = 44 }: Props) {
  const iniciales = `${(nombre ?? '').trim().charAt(0)}${(apellido ?? '').trim().charAt(0)}`;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2 }]}
    >
      <Text style={[estilos.iniciales, { fontSize: Math.round(tamano / 2.8) }]}>
        {iniciales.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center', backgroundColor: colores.suave },
  iniciales: { fontFamily: fuentes.bold, color: colores.principal },
});

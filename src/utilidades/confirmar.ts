/**
 * Confirmación antes de una acción que no se puede deshacer (anular un pase, dar de baja, borrar).
 *
 * Qué hace: muestra un cuadro con "Cancelar" y el botón de la acción, y ejecuta la acción solo si el
 * usuario la acepta.
 * Cómo funciona: en el teléfono usa `Alert.alert`. En web `Alert.alert` no dibuja nada, así que se usa
 * `window.confirm` para poder revisar las pantallas con `npx expo start --web`.
 * Se usa con: `src/app/directiva/residentes/index.tsx`, `src/app/residente/(tabs)/perfil.tsx` y
 * `src/app/residente/(tabs)/visitas.tsx`.
 */
import { Alert, Platform } from 'react-native';

/**
 * Pide confirmación y, si se acepta, ejecuta la acción.
 *
 * @param titulo título corto del cuadro, por ejemplo "Anular pase".
 * @param mensaje explica la consecuencia de la acción.
 * @param textoAccion texto del botón que confirma (se dibuja en rojo en el teléfono).
 * @param alAceptar función que se ejecuta solo si el usuario confirma.
 */
export function confirmar(
  titulo: string,
  mensaje: string,
  textoAccion: string,
  alAceptar: () => void,
): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${titulo}\n\n${mensaje}`)) alAceptar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoAccion, style: 'destructive', onPress: alAceptar },
  ]);
}

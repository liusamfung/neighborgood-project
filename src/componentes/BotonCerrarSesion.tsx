/**
 * BotonCerrarSesion: enlace pequeño "Cerrar sesión" para el encabezado de las pantallas de cada rol.
 *
 * Qué hace: al tocarlo pregunta "¿Quieres salir de tu cuenta?" y, si la persona confirma, cierra la sesión
 * con `cerrarSesion()` de `useSesion()`; la navegación por rol (`src/app/_layout.tsx`) la devuelve sola
 * al inicio de sesión. La confirmación evita sacar por accidente a un guardia en medio de una alerta.
 * Por qué existe: las pantallas reales del guardia y de la directiva no tenían forma de salir de la cuenta,
 * y para cambiar de rol (por ejemplo, en la demostración) hace falta. `PantallaMarcador` trae su propio botón,
 * así que una pantalla que reemplace a un marcador debe incluir este componente para no perderlo.
 * Se usa con: `src/componentes/alertas/ListaAtencion.tsx` (pestaña Alertas del guardia),
 * `src/app/guardia/(tabs)/escaner.tsx` y `src/componentes/publicaciones/HistorialPublicaciones.tsx`
 * (pestañas Avisos y Encuestas de la directiva), el Panel de directiva y
 * `src/componentes/incidencias/ListaIncidencias.tsx` (salida en Incidencias para directiva).
 * Depende de: `src/contexto/SesionContext.tsx` y `src/tema`.
 * Accesibilidad: el área táctil mide al menos 44 px de alto (RNF8).
 */
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useSesion } from '@/contexto/SesionContext';
import { colores, tamanos, tipografia } from '@/tema';

/** Enlace "Cerrar sesión" con confirmación; no recibe datos porque la sesión sale del contexto. */
export function BotonCerrarSesion() {
  const { cerrarSesion } = useSesion();

  /** Pide confirmar y, si la persona acepta, cierra la sesión; si falla, avisa sin dejar la pantalla rota. */
  function pedirConfirmacion() {
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          cerrarSesion().catch((error) => {
            console.error('No se pudo cerrar la sesión', error);
            Alert.alert('No pudimos cerrar la sesión', 'Inténtalo de nuevo.');
          });
        },
      },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      onPress={pedirConfirmacion}
      style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
    >
      <Text style={estilos.texto}>Cerrar sesión</Text>
    </Pressable>
  );
}

// Texto teal sin caja, con alto mínimo de área táctil, para que quepa junto al título de la pantalla.
const estilos = StyleSheet.create({
  boton: {
    minHeight: tamanos.areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  presionado: { opacity: 0.6 },
  texto: { ...tipografia.subtitulo, fontSize: 14, color: colores.principal },
});

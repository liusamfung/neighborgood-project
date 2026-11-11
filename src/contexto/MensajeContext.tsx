/**
 * Contexto de mensajes: el aviso breve que confirma una acción ("Aviso publicado", "Pase creado").
 *
 * Qué hace: cualquier pantalla llama a `mostrarMensaje(texto)` y aparece una franja en la parte de
 * arriba durante unos segundos, sobre la pantalla que esté abierta. Se cierra sola o al tocarla.
 * Por qué existe: después de crear algo la app vuelve a la lista, y la confirmación tiene que seguir
 * visible en la pantalla siguiente. `Alert.alert` no sirve para eso: detiene el flujo hasta que el
 * usuario responde y en web no dibuja nada (el formulario se quedaba abierto y dejaba publicar dos
 * veces lo mismo).
 * Cómo funciona: el proveedor guarda un solo mensaje a la vez; uno nuevo reemplaza al anterior y
 * reinicia el temporizador. El mensaje se dibuja fuera de la navegación, por eso no se pierde al
 * cambiar de pantalla.
 * Se usa con: `src/app/_layout.tsx` (monta el proveedor) y las pantallas que crean, editan o borran
 * algo (`useMensaje`). Depende de: `react-native-safe-area-context` y `src/tema`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, radios, tipografia } from '@/tema';

/** `exito` confirma una acción (teal), `error` avisa de un fallo (rojo) e `info` solo informa. */
export type TipoMensaje = 'exito' | 'error' | 'info';

/** Mensaje que está a la vista. `id` cambia con cada mensaje para reiniciar la animación. */
type Mensaje = { id: number; texto: string; tipo: TipoMensaje };

/** Lo que entrega `useMensaje()` a cualquier pantalla. */
type ValorMensaje = {
  /**
   * Muestra un mensaje breve arriba de la pantalla.
   *
   * @param texto frase corta, por ejemplo "✅ Aviso publicado".
   * @param tipo color del mensaje; por defecto `exito`.
   */
  mostrarMensaje: (texto: string, tipo?: TipoMensaje) => void;
};

// Cuánto tiempo queda visible un mensaje antes de cerrarse solo.
const DURACION_MS = 4000;

// Color de fondo de cada tipo; el texto siempre es blanco para que se lea sobre los tres.
const FONDOS: Record<TipoMensaje, string> = {
  exito: colores.principal,
  error: colores.peligroTexto,
  info: colores.texto,
};

const MensajeContext = createContext<ValorMensaje | null>(null);

/**
 * Franja del mensaje: aparece deslizándose desde arriba y se cierra al tocarla.
 * Es un componente aparte para que su animación empiece de cero con cada mensaje (`key` = id).
 */
function Franja({ mensaje, alCerrar }: { mensaje: Mensaje; alCerrar: () => void }) {
  const margenes = useSafeAreaInsets();
  // El valor animado va de 0 (oculto) a 1 (visible); se crea una sola vez por franja.
  const [avance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(avance, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [avance]);

  return (
    // `box-none` deja pasar los toques a la pantalla de abajo, salvo sobre la propia franja.
    <View pointerEvents="box-none" style={[estilos.capa, { top: margenes.top + 8 }]}>
      <Animated.View
        style={{
          opacity: avance,
          transform: [
            { translateY: avance.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          ],
        }}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Toca para cerrar el mensaje"
          onPress={alCerrar}
          style={[estilos.franja, { backgroundColor: FONDOS[mensaje.tipo] }]}
        >
          <Text style={estilos.texto}>{mensaje.texto}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Proveedor de mensajes: se monta una sola vez en `src/app/_layout.tsx`, por fuera de la navegación.
 */
export function MensajeProvider({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  // El temporizador y el contador viven en referencias: cambiarlos no debe redibujar nada.
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contador = useRef(0);

  // Al desmontar el proveedor se cancela el temporizador pendiente.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  /** Quita el mensaje de la vista y cancela su temporizador. */
  const cerrar = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    setMensaje(null);
  }, []);

  /** Muestra un mensaje nuevo; si había otro, lo reemplaza y el tiempo vuelve a empezar. */
  const mostrarMensaje = useCallback(
    (texto: string, tipo: TipoMensaje = 'exito') => {
      if (temporizador.current) clearTimeout(temporizador.current);
      contador.current += 1;
      setMensaje({ id: contador.current, texto, tipo });
      temporizador.current = setTimeout(cerrar, DURACION_MS);
    },
    [cerrar],
  );

  // `useCallback` y `useMemo` mantienen la misma función entre dibujos: las pantallas que la usan no
  // se redibujan cada vez que aparece o desaparece un mensaje.
  const valor = useMemo(() => ({ mostrarMensaje }), [mostrarMensaje]);

  return (
    <MensajeContext.Provider value={valor}>
      <View style={estilos.raiz}>
        {children}
        {mensaje ? <Franja key={mensaje.id} mensaje={mensaje} alCerrar={cerrar} /> : null}
      </View>
    </MensajeContext.Provider>
  );
}

/**
 * Hook para mostrar un mensaje breve desde cualquier pantalla.
 * Lanza un error si se usa fuera de `MensajeProvider`.
 */
export function useMensaje(): ValorMensaje {
  const valor = useContext(MensajeContext);
  if (!valor) throw new Error('useMensaje debe usarse dentro de <MensajeProvider>');
  return valor;
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  // Capa que flota sobre toda la app, centrada y con margen a los lados.
  capa: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 100 },
  franja: {
    maxWidth: 520,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radios.tarjeta,
    boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.2)',
  },
  texto: { ...tipografia.subtitulo, fontSize: 15, textAlign: 'center', color: colores.superficie },
});

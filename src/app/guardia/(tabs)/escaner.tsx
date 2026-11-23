/**
 * Ruta `/guardia/escaner` (rol Guardia): pantalla P11 · Escáner QR del mockup (RF18, RF19, RF20).
 *
 * Qué hace: el guardia apunta la cámara al QR del pase que muestra la visita. Si el pase está vigente y es
 * de hoy, ve "Pase válido" con el visitante, la unidad y quién autorizó, y el pase queda usado con la
 * hora del ingreso (RF19, diagrama 3.3), por eso no hace falta el botón "Marcar pase como usado" del
 * mockup. Si no, ve el motivo: "Pase no válido o vencido", "Pase ya usado" o "Pase anulado" (RF22).
 * Si el QR no se lee, puede escribir el código a mano. Abajo, "Visitas de hoy y salidas" abre la lista
 * donde se registra la salida (RF20).
 * Cómo funciona: la decisión la toma la Edge Function `validar-pase` (con la hora de Lima del servidor);
 * la pantalla solo manda el texto leído. La cámara lee el mismo QR muchas veces por segundo: un candado
 * (`ocupado`) deja pasar solo la primera lectura hasta que el guardia toca "Escanear otro pase". Al llegar
 * el resultado el teléfono vibra distinto si es válido o rechazado, para que el guardia lo sienta sin leer.
 * Como la pantalla no tiene cabecera propia, deja el alto de la barra de estado (hora, batería, isla
 * dinámica) y muestra "Cerrar sesión" junto al título: es la forma que tiene el guardia de salir de su cuenta.
 * Se usa con: la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña.
 * Depende de: `expo-camera` (permiso y lector de QR), `expo-haptics`, `src/hooks/useValidarPase.ts`,
 * `ResultadoEscaneo`, `Boton`, `CampoTexto`, el tema y la ruta `src/app/guardia/visitas.tsx`.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonCerrarSesion } from '@/componentes/BotonCerrarSesion';
import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { ResultadoEscaneo, type Resultado } from '@/componentes/visitas/ResultadoEscaneo';
import { useValidarPase } from '@/hooks/useValidarPase';
import { colores, espacios, radios, tipografia } from '@/tema';

/** P11 · Escáner QR del guardia. */
export default function Escaner() {
  const router = useRouter();
  // Alto de la barra de estado, para que el título no quede debajo de la hora y la isla dinámica.
  const { top } = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const validar = useValidarPase();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [codigo, setCodigo] = useState('');
  // Candado: true desde que se manda un código hasta que el guardia pide escanear otro. Es una referencia y
  // no un estado porque debe cambiar al instante, sin esperar al siguiente dibujo de la pantalla.
  const ocupado = useRef(false);

  /**
   * Manda un código a validar y guarda el resultado para mostrarlo.
   *
   * @param texto contenido del QR o código escrito a mano.
   */
  function validarCodigo(texto: string) {
    if (ocupado.current || !texto.trim()) return;
    ocupado.current = true;
    validar.mutate(texto, {
      onSuccess: (pase) => {
        setResultado({ pase });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (error) => {
        setResultado({
          motivo:
            error instanceof Error
              ? error.message
              : 'No pudimos validar el pase. Inténtalo de nuevo.',
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  }

  /** Limpia el resultado y suelta el candado para escanear el siguiente pase. */
  function escanearOtro() {
    ocupado.current = false;
    setResultado(null);
    setCodigo('');
  }

  /**
   * Lo que va en el recuadro de la cámara según el permiso y si se está validando. Es una función que se
   * llama, no un componente: así la cámara no se vuelve a montar cada vez que el guardia escribe un código.
   */
  function dibujarVisor() {
    if (validar.isPending || !permiso) {
      // Validando, o el permiso de la cámara todavía se está consultando.
      return (
        <View style={estilos.camara}>
          <ActivityIndicator color={colores.superficie} />
          {validar.isPending ? <Text style={estilos.leyenda}>Validando el pase…</Text> : null}
        </View>
      );
    }
    if (!permiso.granted) {
      return (
        <View style={estilos.tarjeta}>
          <Text style={estilos.texto}>
            📷 Para leer el QR del pase, NeighborGood necesita usar la cámara.
          </Text>
          <Boton texto="Permitir cámara" alPresionar={() => void pedirPermiso()} />
        </View>
      );
    }
    return (
      <View style={estilos.camara}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => validarCodigo(data)}
        />
        {/* Mira del mockup: cuatro esquinas blancas que marcan dónde poner el QR. */}
        <View pointerEvents="none" style={estilos.mira}>
          <View style={[estilos.esquina, estilos.arribaIzquierda]} />
          <View style={[estilos.esquina, estilos.arribaDerecha]} />
          <View style={[estilos.esquina, estilos.abajoIzquierda]} />
          <View style={[estilos.esquina, estilos.abajoDerecha]} />
        </View>
        <Text style={[estilos.leyenda, estilos.leyendaAbajo]}>Apunta la cámara al QR del pase</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.pantalla}
    >
      <ScrollView
        contentContainerStyle={[estilos.contenido, { paddingTop: top + espacios.margenLateral }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.encabezado}>
          <Text style={[estilos.titulo, estilos.tituloEncabezado]}>Escáner de visitas</Text>
          <BotonCerrarSesion />
        </View>

        {resultado ? (
          <ResultadoEscaneo resultado={resultado} alEscanearOtro={escanearOtro} />
        ) : (
          <>
            {dibujarVisor()}
            <View style={estilos.tarjeta}>
              <Text style={estilos.subtitulo}>¿El QR no se lee?</Text>
              <CampoTexto
                etiqueta="Código del pase"
                placeholder="Pega o escribe el código del pase"
                value={codigo}
                onChangeText={setCodigo}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Boton
                variante="secundario"
                texto="Validar código"
                alPresionar={() => validarCodigo(codigo)}
                cargando={validar.isPending}
              />
            </View>
          </>
        )}

        {/* RF20: la salida se registra desde la lista del día, no escaneando otra vez. */}
        <Boton
          variante="secundario"
          texto="Visitas de hoy y salidas"
          alPresionar={() => router.push('/guardia/visitas')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Largo y grosor de cada esquina de la mira.
const ESQUINA = 36;
const GROSOR = 4;

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  titulo: { ...tipografia.titulo, color: colores.texto },
  // Fila del título con "Cerrar sesión" a la derecha; el título puede encogerse si el texto es grande.
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tituloEncabezado: { flexShrink: 1 },
  subtitulo: { ...tipografia.subtitulo, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  // Recuadro oscuro de la cámara; `overflow` recorta la imagen a las esquinas redondeadas.
  camara: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
    borderRadius: 20,
  },
  mira: { width: '60%', aspectRatio: 1 },
  esquina: { position: 'absolute', width: ESQUINA, height: ESQUINA, borderColor: '#FFFFFF' },
  arribaIzquierda: { top: 0, left: 0, borderTopWidth: GROSOR, borderLeftWidth: GROSOR },
  arribaDerecha: { top: 0, right: 0, borderTopWidth: GROSOR, borderRightWidth: GROSOR },
  abajoIzquierda: { bottom: 0, left: 0, borderBottomWidth: GROSOR, borderLeftWidth: GROSOR },
  abajoDerecha: { bottom: 0, right: 0, borderBottomWidth: GROSOR, borderRightWidth: GROSOR },
  leyenda: { ...tipografia.cuerpo, color: '#FFFFFF' },
  leyendaAbajo: { position: 'absolute', bottom: 16 },
  tarjeta: {
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
});

/**
 * Ruta `/guardia/escaner` (rol Guardia): pantalla P11 · Escáner QR. RF18, RF19, RF20.
 *
 * Qué hace: el guardia apunta la cámara al código QR del pase. Si el pase es de hoy y está vigente ve
 * "Pase válido" con el visitante, la unidad y quién autorizó, y el ingreso queda registrado (RF18,
 * RF19, RF20). Si no, ve el motivo: "Pase no válido o vencido", "Pase ya usado" o "Pase anulado".
 * También puede escribir el código a mano (por si el QR no se lee) y abrir "Visitas de hoy" para
 * registrar salidas.
 * Cómo funciona: la validación la hace la Edge Function `validar-pase`, que en una sola llamada
 * comprueba el pase, lo marca usado y guarda la hora (diagrama 3.3); por eso no existe el botón
 * "Marcar pase como usado" del mockup. La cámara lee el mismo QR muchas veces por segundo: un
 * candado (`ocupado`) deja pasar solo la primera lectura hasta que el guardia toca "Escanear otro
 * pase"; sin él, la segunda lectura respondería "Pase ya usado" sobre un pase recién validado.
 * Se usa con: `src/hooks/usePases.ts` (`useValidarPase`), `src/repositorios/pases.ts` (tipos y
 * mensajes), `expo-camera`, `Boton`, `CampoTexto`, `IconoCuadro`, el tema y la barra inferior de
 * `(tabs)/_layout.tsx`.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { IconoCuadro } from '@/componentes/IconoCuadro';
import { useValidarPase } from '@/hooks/usePases';
import { mensajeDeErrorPase, type PaseGuardia } from '@/repositorios/pases';
import { chipsPase, colores, espacios, radios, sombras, tipografia } from '@/tema';
import { soloHora } from '@/utilidades/fechas';

/** Resultado de la última validación: el pase que ingresó o el motivo del rechazo. */
type Resultado = { pase: PaseGuardia; motivo?: never } | { pase?: never; motivo: string };

/** Renglón "etiqueta — valor" de la tarjeta del pase válido (Visita, Va a, Autorizó). */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      <Text style={estilos.valorDato}>{valor}</Text>
    </View>
  );
}

/** P11 · Escáner QR del guardia. */
export default function Escaner() {
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const validar = useValidarPase();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [codigo, setCodigo] = useState('');
  // Candado: true desde que se manda un código hasta que el guardia pide escanear otro. Es una
  // referencia y no un estado porque debe cambiar al instante, sin esperar al siguiente dibujo.
  const ocupado = useRef(false);

  /**
   * Envía un código a validar y guarda el resultado para mostrarlo.
   *
   * @param texto contenido del QR o código escrito a mano.
   */
  function validarCodigo(texto: string) {
    if (ocupado.current || !texto.trim()) return;
    ocupado.current = true;
    validar.mutate(texto, {
      onSuccess: (pase) => setResultado({ pase }),
      onError: (e) => setResultado({ motivo: mensajeDeErrorPase(e) }),
    });
  }

  /** Limpia el resultado y suelta el candado para escanear el siguiente pase. */
  function escanearOtro() {
    ocupado.current = false;
    setResultado(null);
    setCodigo('');
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flexible}
      >
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo}>Escáner de visitas 📷</Text>

          {resultado?.pase ? (
            // Pase válido: tarjeta verde con los datos del visitante (mockup P11).
            <View style={[estilos.resultado, estilos.valido]}>
              <View style={estilos.fila}>
                <IconoCuadro
                  icono="check"
                  tamano={56}
                  redondo
                  color={{ fondo: chipsPase.vigente.texto, texto: colores.superficie }}
                />
                <View style={estilos.flexible}>
                  <Text style={[estilos.veredicto, { color: chipsPase.vigente.texto }]}>
                    Pase válido
                  </Text>
                  {resultado.pase.ingreso_en ? (
                    <Text style={[estilos.texto, { color: chipsPase.vigente.texto }]}>
                      Ingreso registrado a las {soloHora(resultado.pase.ingreso_en)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Dato etiqueta="Visita" valor={resultado.pase.nombre_visitante} />
              <Dato etiqueta="Va a" valor={resultado.pase.unidad} />
              {resultado.pase.autorizo ? (
                <Dato etiqueta="Autorizó" valor={resultado.pase.autorizo} />
              ) : null}
              <Boton icono="camera" texto="Escanear otro pase" alPresionar={escanearOtro} />
            </View>
          ) : resultado ? (
            // Rechazo: tarjeta roja con el motivo que respondió la función.
            <View style={[estilos.resultado, estilos.rechazado]}>
              <View style={estilos.fila}>
                <IconoCuadro
                  icono="x"
                  tamano={56}
                  redondo
                  color={{ fondo: colores.emergencia, texto: colores.superficie }}
                />
                <View style={estilos.flexible}>
                  <Text
                    accessibilityRole="alert"
                    style={[estilos.veredicto, { color: chipsPase.anulado.texto }]}
                  >
                    {resultado.motivo}
                  </Text>
                  <Text style={[estilos.texto, { color: chipsPase.anulado.texto }]}>
                    No dejes ingresar a esta visita con este pase.
                  </Text>
                </View>
              </View>
              <Boton icono="camera" texto="Escanear otro pase" alPresionar={escanearOtro} />
            </View>
          ) : validar.isPending ? (
            <View style={estilos.camara}>
              <ActivityIndicator color={colores.superficie} />
              <Text style={estilos.leyenda}>Validando el pase…</Text>
            </View>
          ) : !permiso ? (
            // El permiso de la cámara todavía se está consultando.
            <View style={estilos.camara}>
              <ActivityIndicator color={colores.superficie} />
            </View>
          ) : !permiso.granted ? (
            <View style={estilos.tarjeta}>
              <Text style={estilos.texto}>
                📷 Para leer el código QR del pase, NeighborGood necesita usar la cámara.
              </Text>
              <Boton
                icono="camera"
                texto="Permitir cámara"
                alPresionar={() => void pedirPermiso()}
              />
            </View>
          ) : (
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
              <Text style={[estilos.leyenda, estilos.leyendaAbajo]}>
                Apunta la cámara al QR del pase
              </Text>
            </View>
          )}

          {!resultado ? (
            <View style={estilos.tarjeta}>
              <Text style={estilos.subtitulo}>¿El código no se lee?</Text>
              <CampoTexto
                etiqueta="Código del pase"
                placeholder="Pega o escribe el código"
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
          ) : null}

          <Boton
            variante="secundario"
            icono="list"
            texto="Visitas de hoy y salidas"
            alPresionar={() => router.push('/guardia/visitas')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Largo y grosor de cada esquina de la mira.
const ESQUINA = 36;
const GROSOR = 4;

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flexible: { flex: 1 },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { ...tipografia.tituloPantalla, color: colores.texto },
  subtitulo: { ...tipografia.subtitulo, color: colores.texto },
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
  arribaIzquierda: {
    top: 0,
    left: 0,
    borderTopWidth: GROSOR,
    borderLeftWidth: GROSOR,
    borderTopLeftRadius: 12,
  },
  arribaDerecha: {
    top: 0,
    right: 0,
    borderTopWidth: GROSOR,
    borderRightWidth: GROSOR,
    borderTopRightRadius: 12,
  },
  abajoIzquierda: {
    bottom: 0,
    left: 0,
    borderBottomWidth: GROSOR,
    borderLeftWidth: GROSOR,
    borderBottomLeftRadius: 12,
  },
  abajoDerecha: {
    bottom: 0,
    right: 0,
    borderBottomWidth: GROSOR,
    borderRightWidth: GROSOR,
    borderBottomRightRadius: 12,
  },
  leyenda: { ...tipografia.cuerpo, color: '#FFFFFF' },
  leyendaAbajo: { position: 'absolute', bottom: 16 },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  resultado: { padding: 20, gap: 12, borderWidth: 2, borderRadius: radios.tarjeta },
  valido: { backgroundColor: chipsPase.vigente.fondo, borderColor: chipsPase.vigente.texto },
  rechazado: { backgroundColor: chipsPase.anulado.fondo, borderColor: colores.peligroBorde },
  veredicto: { ...tipografia.titulo },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  // Renglón de dato: etiqueta gris a la izquierda y valor en negrita a la derecha.
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  etiquetaDato: { ...tipografia.cuerpo, fontSize: 15, color: colores.textoSecundario },
  valorDato: {
    ...tipografia.subtitulo,
    flexShrink: 1,
    textAlign: 'right',
    color: colores.texto,
  },
});

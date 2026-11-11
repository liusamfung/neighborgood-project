/**
 * Ruta `/guardia/escaner` (rol Guardia): pantalla P11 · Escáner QR. RF18, RF19, RF20.
 *
 * Qué hace: el guardia apunta la cámara al código QR del pase. Si el pase es de hoy y está vigente ve
 * "Pase válido" con el visitante y la unidad, y el ingreso queda registrado (RF18, RF19, RF20). Si no,
 * ve el motivo: "Pase no válido o vencido", "Pase ya usado" o "Pase anulado". También puede escribir
 * el código a mano (por si el QR no se lee) y abrir "Visitas de hoy" para registrar salidas.
 * Cómo funciona: la validación la hace la Edge Function `validar-pase`; la app solo le manda el texto
 * leído. Mientras hay un resultado en pantalla o una validación en curso, la cámara no lee otro
 * código: así un mismo QR no se envía dos veces.
 * Se usa con: `src/hooks/usePases.ts` (`useValidarPase`), `src/repositorios/pases.ts` (tipos y
 * mensajes), `expo-camera`, `Boton`, `CampoTexto`, el tema y la barra inferior de `(tabs)/_layout.tsx`.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useValidarPase } from '@/hooks/usePases';
import { mensajeDeErrorPase, type PaseGuardia } from '@/repositorios/pases';
import { chipsPase, colores, espacios, radios, tipografia } from '@/tema';
import { soloHora } from '@/utilidades/fechas';

/** Resultado de la última validación: el pase que ingresó o el motivo del rechazo. */
type Resultado = { pase: PaseGuardia; motivo?: never } | { pase?: never; motivo: string };

/** P11 · Escáner QR del guardia. */
export default function Escaner() {
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const validar = useValidarPase();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [codigo, setCodigo] = useState('');

  /**
   * Envía un código a validar y guarda el resultado para mostrarlo.
   *
   * @param texto contenido del QR o código escrito a mano.
   */
  function validarCodigo(texto: string) {
    // Con un resultado a la vista o una validación en curso se ignoran las lecturas nuevas.
    if (resultado || validar.isPending || !texto.trim()) return;
    validar.mutate(texto, {
      onSuccess: (pase) => setResultado({ pase }),
      onError: (e) => setResultado({ motivo: mensajeDeErrorPase(e) }),
    });
  }

  /** Limpia el resultado para escanear el siguiente pase. */
  function escanearOtro() {
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
          <Text style={estilos.titulo}>Escáner QR</Text>

          {resultado ? (
            // Resultado de la validación: verde si ingresó, rojo con el motivo si se rechazó.
            <View style={[estilos.resultado, resultado.pase ? estilos.valido : estilos.rechazado]}>
              {resultado.pase ? (
                <>
                  <Text style={[estilos.veredicto, { color: chipsPase.vigente.texto }]}>
                    Pase válido
                  </Text>
                  <Text style={estilos.nombre}>{resultado.pase.nombre_visitante}</Text>
                  <Text style={estilos.texto}>Visita a {resultado.pase.unidad}</Text>
                  {resultado.pase.ingreso_en ? (
                    <Text style={estilos.texto}>
                      Ingreso registrado a las {soloHora(resultado.pase.ingreso_en)}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text
                  accessibilityRole="alert"
                  style={[estilos.veredicto, { color: chipsPase.anulado.texto }]}
                >
                  {resultado.motivo}
                </Text>
              )}
              <Boton texto="Escanear otro pase" alPresionar={escanearOtro} />
            </View>
          ) : validar.isPending ? (
            <View style={estilos.camara}>
              <ActivityIndicator color={colores.principal} />
              <Text style={estilos.texto}>Validando el pase…</Text>
            </View>
          ) : !permiso ? (
            // El permiso todavía se está consultando.
            <View style={estilos.camara}>
              <ActivityIndicator color={colores.principal} />
            </View>
          ) : !permiso.granted ? (
            <View style={estilos.tarjeta}>
              <Text style={estilos.texto}>
                Para leer el código QR del pase, NeighborGood necesita usar la cámara.
              </Text>
              <Boton texto="Permitir cámara" alPresionar={() => void pedirPermiso()} />
            </View>
          ) : (
            <View style={estilos.camara}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => validarCodigo(data)}
              />
            </View>
          )}

          {!resultado ? (
            <View style={estilos.tarjeta}>
              <Text style={estilos.subtitulo}>¿El código no se lee?</Text>
              <CampoTexto
                etiqueta="Código del pase"
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
            texto="Visitas de hoy y salidas"
            alPresionar={() => router.push('/guardia/visitas')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flexible: { flex: 1 },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  titulo: { ...tipografia.titulo, color: colores.texto },
  subtitulo: { ...tipografia.subtitulo, color: colores.texto },
  // Recuadro cuadrado de la cámara; `overflow` recorta la imagen a las esquinas redondeadas.
  camara: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  tarjeta: {
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  resultado: { padding: 20, gap: 10, borderWidth: 2, borderRadius: radios.tarjeta },
  valido: { backgroundColor: chipsPase.vigente.fondo, borderColor: chipsPase.vigente.texto },
  rechazado: { backgroundColor: chipsPase.anulado.fondo, borderColor: colores.peligroBorde },
  veredicto: { ...tipografia.titulo },
  nombre: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.texto },
});

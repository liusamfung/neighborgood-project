/**
 * Ruta `/residente/visitas` (rol Residente): pantalla P6 · Visitas y pase QR. RF15, RF16, RF17, RF22.
 *
 * Qué hace: el residente crea un pase indicando el nombre del visitante, la fecha y la hora estimada
 * (RF15; corrección 2 de DISENO.md). Cada pase vigente muestra su código QR (RF16), que se puede
 * compartir (RF17) o anular (RF22). La lista muestra el estado de cada pase: vigente, usado, anulado
 * o vencido, y la hora de ingreso y de salida cuando existen.
 * Cómo funciona: el pase lo crea la Edge Function `crear-pase`; la app solo dibuja como QR el id que
 * devuelve. Al crear un pase el formulario se limpia, aparece la franja de confirmación y el QR nuevo
 * queda a la vista. El aviso "Tu visita ingresó" (RF21) no vive aquí sino en `residente/_layout.tsx`,
 * para que llegue en cualquier pantalla del residente.
 * Se usa con: `src/hooks/usePases.ts`, `src/hooks/useAhora.ts`, `src/repositorios/pases.ts` (tipos y
 * mensajes), `compartirPase`, `confirmar`, `useMensaje`, `useSesion`, los componentes `CampoTexto`,
 * `CampoFecha`, `Boton`, `Insignia`, `IconoCuadro` y `EstadoVacio`, y el tema.
 */
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoVacio } from '@/componentes/EstadoVacio';
import { Boton } from '@/componentes/formulario/Boton';
import { CampoFecha } from '@/componentes/formulario/CampoFecha';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { IconoCuadro } from '@/componentes/IconoCuadro';
import { Insignia } from '@/componentes/Insignia';
import { useMensaje } from '@/contexto/MensajeContext';
import { useSesion } from '@/contexto/SesionContext';
import { useAhora } from '@/hooks/useAhora';
import { useAnularPase, useCrearPase, useMisPases } from '@/hooks/usePases';
import {
  estadoVisible,
  mensajeDeErrorPase,
  type EstadoVisible,
  type Pase,
} from '@/repositorios/pases';
import { chipsPase, colores, espacios, radios, sombras, tipografia } from '@/tema';
import { compartirPase } from '@/utilidades/compartirPase';
import { confirmar } from '@/utilidades/confirmar';
import { diaEnLima, diaLegible, horaEnLima, horaLegible, soloHora } from '@/utilidades/fechas';

// Texto y color de la insignia de cada estado; "vencido" usa el gris de "usado".
const ESTADOS: Record<EstadoVisible, { texto: string; color: { fondo: string; texto: string } }> = {
  vigente: { texto: 'Vigente', color: chipsPase.vigente },
  usado: { texto: 'Usado', color: chipsPase.usado },
  anulado: { texto: 'Anulado', color: chipsPase.anulado },
  vencido: { texto: 'Vencido', color: chipsPase.usado },
};

/** Hora por defecto del formulario: dentro de una hora, sin segundos. */
function dentroDeUnaHora(): Date {
  const fecha = new Date(Date.now() + 60 * 60 * 1000);
  fecha.setSeconds(0, 0);
  return fecha;
}

/** P6 · Visitas del residente: crear pases y ver, compartir o anular su código QR. */
export default function Visitas() {
  const { perfil } = useSesion();
  const { mostrarMensaje } = useMensaje();
  const ahora = useAhora();
  const pases = useMisPases(perfil?.id);
  const crear = useCrearPase();
  const anular = useAnularPase();

  const [nombre, setNombre] = useState('');
  const [llegada, setLlegada] = useState(dentroDeUnaHora);
  const [error, setError] = useState<string | null>(null);
  // Id del pase cuyo QR está a la vista (uno a la vez).
  const [abierto, setAbierto] = useState<string | null>(null);
  // Referencia al QR visible, para pedirle su imagen al compartir.
  const refQr = useRef<{ toDataURL: (listo: (base64: string) => void) => void } | null>(null);

  // "Hoy" en Lima: decide si un pase vigente ya venció (RNF3).
  const hoy = diaEnLima(new Date(ahora));

  /** Valida el formulario y crea el pase; al terminar lo limpia y deja el QR nuevo a la vista. */
  function crearPase() {
    setError(null);
    const visitante = nombre.trim();
    if (visitante.length < 2) return setError('Escribe el nombre del visitante.');
    const fechaVisita = diaEnLima(llegada);
    if (fechaVisita < hoy) return setError('La fecha de la visita no puede ser un día pasado.');
    crear.mutate(
      { nombreVisitante: visitante, fechaVisita, horaEstimada: horaEnLima(llegada) },
      {
        onSuccess: (pase) => {
          // El formulario vuelve a quedar vacío: así no se crea dos veces el mismo pase.
          setNombre('');
          setLlegada(dentroDeUnaHora());
          setAbierto(pase.id);
          mostrarMensaje(`🎟️ Pase creado para ${visitante}`);
        },
        onError: (e) => setError(mensajeDeErrorPase(e)),
      },
    );
  }

  /** Pide confirmación y anula un pase vigente (RF22). */
  function confirmarAnulacion(pase: Pase) {
    confirmar(
      'Anular pase',
      `El pase de ${pase.nombre_visitante} dejará de servir y no se puede reactivar.`,
      'Anular pase',
      () => {
        setError(null);
        anular.mutate(pase.id, {
          onSuccess: () => {
            setAbierto(null);
            mostrarMensaje(`🚫 Pase de ${pase.nombre_visitante} anulado`);
          },
          onError: (e) => setError(mensajeDeErrorPase(e)),
        });
      },
    );
  }

  /** Pide al QR visible su imagen y abre el menú de compartir (RF17). */
  function compartir(pase: Pase) {
    const enviar = (base64: string | null) =>
      compartirPase(pase, base64).catch(() => setError('No pudimos compartir el pase.'));
    if (refQr.current) refQr.current.toDataURL((base64) => enviar(base64));
    else enviar(null);
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flexible}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={pases.isRefetching}
              onRefresh={() => void pases.refetch()}
            />
          }
        >
          <Text style={estilos.titulo}>Visitas 🎟️</Text>

          <View style={estilos.tarjeta}>
            <Text style={estilos.subtitulo}>Nuevo pase</Text>
            <CampoTexto
              etiqueta="Nombre del visitante"
              placeholder="Por ejemplo: Carlos Pérez"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
            />
            <CampoFecha
              etiqueta="Fecha y hora estimada de llegada"
              valor={llegada}
              alCambiar={setLlegada}
            />
            <Text style={estilos.detalle}>El pase vale solo ese día, hasta las 11:59 p. m.</Text>
            <Boton
              icono="plus"
              texto="Generar pase"
              alPresionar={crearPase}
              cargando={crear.isPending}
            />
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={estilos.error}>
              {error}
            </Text>
          ) : null}

          <Text style={estilos.subtitulo}>Mis pases</Text>
          {pases.isPending ? (
            <ActivityIndicator color={colores.principal} />
          ) : pases.isError ? (
            <>
              <Text accessibilityRole="alert" style={estilos.error}>
                No pudimos cargar tus pases. Revisa tu conexión.
              </Text>
              <Boton variante="secundario" texto="Reintentar" alPresionar={() => pases.refetch()} />
            </>
          ) : pases.data.length === 0 ? (
            <EstadoVacio emoji="🎟️" mensaje="Todavía no has creado pases de visita." />
          ) : (
            pases.data.map((pase) => {
              const estado = estadoVisible(pase, hoy);
              const vigente = estado === 'vigente';
              const verQr = vigente && abierto === pase.id;
              return (
                <View key={pase.id} style={estilos.tarjeta}>
                  {/* Un pase vigente se abre y se cierra al tocar su cabecera. */}
                  <Pressable
                    accessibilityRole={vigente ? 'button' : undefined}
                    accessibilityState={vigente ? { expanded: verQr } : undefined}
                    disabled={!vigente}
                    onPress={() => setAbierto(verQr ? null : pase.id)}
                    style={estilos.fila}
                  >
                    <IconoCuadro icono={vigente ? 'grid' : 'user'} tamano={40} />
                    <View style={estilos.flexible}>
                      <Text style={estilos.nombre}>
                        {verQr ? `Pase de ${pase.nombre_visitante}` : pase.nombre_visitante}
                      </Text>
                      <Text style={estilos.detalle}>
                        {diaLegible(pase.fecha_visita)}
                        {pase.hora_estimada ? ` · ${horaLegible(pase.hora_estimada)}` : ''}
                      </Text>
                    </View>
                    <Insignia texto={ESTADOS[estado].texto} color={ESTADOS[estado].color} />
                  </Pressable>

                  {pase.ingreso_en ? (
                    <Text style={estilos.detalle}>
                      Ingresó a las {soloHora(pase.ingreso_en)}
                      {pase.salida_en ? ` · salió a las ${soloHora(pase.salida_en)}` : ''}
                    </Text>
                  ) : null}

                  {vigente && !verQr ? (
                    <Boton
                      variante="secundario"
                      icono="grid"
                      texto="Ver código QR"
                      alPresionar={() => setAbierto(pase.id)}
                    />
                  ) : null}

                  {verQr ? (
                    <>
                      {/* El QR lleva solo el id del pase; fondo blanco para que la cámara lo lea bien. */}
                      <View style={estilos.qr} accessibilityLabel="Código QR del pase">
                        <QRCode
                          value={pase.id}
                          size={220}
                          getRef={(qr) => {
                            refQr.current = qr;
                          }}
                        />
                      </View>
                      <Text style={[estilos.detalle, estilos.centrado]}>
                        Válido solo el {diaLegible(pase.fecha_visita)}, hasta las 11:59 p. m.
                      </Text>
                      <View style={estilos.botones}>
                        <View style={estilos.flexible}>
                          <Boton
                            icono="share-2"
                            texto="Compartir"
                            alPresionar={() => compartir(pase)}
                          />
                        </View>
                        <View style={estilos.flexible}>
                          <Boton
                            variante="peligro"
                            texto="Anular pase"
                            alPresionar={() => confirmarAnulacion(pase)}
                            cargando={anular.isPending}
                          />
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flexible: { flex: 1 },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  titulo: { ...tipografia.tituloPantalla, color: colores.texto },
  subtitulo: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nombre: { ...tipografia.subtitulo, fontSize: 17, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  centrado: { textAlign: 'center' },
  qr: {
    alignSelf: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  // Compartir y Anular van lado a lado, cada uno con la mitad del ancho (mockup P6).
  botones: { flexDirection: 'row', gap: 10 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

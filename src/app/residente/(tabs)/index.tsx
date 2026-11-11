/**
 * Ruta `/residente` (rol Residente): pantalla P2 · Inicio del mockup.
 *
 * Qué hace: saluda al residente con su unidad y reúne lo que tiene pendiente hoy: el aviso vigente más
 * reciente, la encuesta en la que su unidad todavía no votó (primero las obligatorias) y sus visitas
 * de hoy con pase vigente. Cada tarjeta abre su pantalla. Arriba está el botón de pánico del mockup:
 * abre el flujo de alerta (P3), que se implementa en el Sprint 5 (RF23); hasta entonces esa pantalla
 * sigue siendo un marcador.
 * Cómo funciona: reutiliza las consultas de las otras pestañas (avisos, encuestas y pases), así que
 * comparte su caché; lo único que pide aparte es la unidad del residente.
 * Se usa con: `src/hooks/useAvisos.ts`, `useEncuestas.ts`, `usePases.ts`, `useResidentes.ts`
 * (`useUnidad`), `useAhora.ts`, `useSesion`, los componentes `Avatar`, `IconoCuadro`, `Insignia` y
 * `EstadoVacio`, el tema y la barra inferior de `(tabs)/_layout.tsx`.
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/componentes/Avatar';
import { iconoDeCategoria } from '@/componentes/avisos/TarjetaAviso';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { IconoCuadro } from '@/componentes/IconoCuadro';
import { Insignia } from '@/componentes/Insignia';
import { useSesion } from '@/contexto/SesionContext';
import { useAhora } from '@/hooks/useAhora';
import { useAvisos } from '@/hooks/useAvisos';
import { useEncuestas } from '@/hooks/useEncuestas';
import { useMisPases } from '@/hooks/usePases';
import { useUnidad } from '@/hooks/useResidentes';
import { textoDeUnidad } from '@/repositorios/residentes';
import { chipsIncidencia, chipsPase, colores, espacios, radios, sombras, tipografia } from '@/tema';
import { diaEnLima, fechaYHora, horaLegible } from '@/utilidades/fechas';

/** P2 · Inicio del residente: saludo, botón de pánico y lo pendiente de hoy. */
export default function Inicio() {
  const router = useRouter();
  const { perfil } = useSesion();
  const ahora = useAhora();
  const unidad = useUnidad(perfil?.unidad_id);
  const avisos = useAvisos();
  const encuestas = useEncuestas();
  const pases = useMisPases(perfil?.id);

  // Aviso vigente más reciente (la lista ya viene del más nuevo al más antiguo).
  const aviso = (avisos.data ?? []).find((a) => new Date(a.vigente_hasta).getTime() > ahora);
  // Encuestas abiertas en las que la unidad no votó; las obligatorias van primero (RF14).
  const pendientes = (encuestas.data ?? []).filter(
    (e) => new Date(e.cierra_en).getTime() > ahora && e.votos.length === 0,
  );
  const encuesta = pendientes.find((e) => e.prioridad === 'alta') ?? pendientes[0];
  // Visitas de hoy (hora de Lima) cuyo pase sigue vigente.
  const hoy = diaEnLima(new Date(ahora));
  const visitasDeHoy = (pases.data ?? []).filter(
    (p) => p.estado === 'vigente' && p.fecha_visita === hoy,
  );

  const cargando = avisos.isPending || encuestas.isPending || pases.isPending;
  const conError = avisos.isError || encuestas.isError || pases.isError;
  const sinNovedades = !aviso && !encuesta && visitasDeHoy.length === 0;

  /** Vuelve a pedir avisos, encuestas y pases (deslizar hacia abajo y "Reintentar"). */
  function recargar() {
    avisos.refetch();
    encuestas.refetch();
    pases.refetch();
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={avisos.isRefetching || encuestas.isRefetching || pases.isRefetching}
            onRefresh={recargar}
          />
        }
      >
        {/* Barra superior: marca a la izquierda y avatar (abre el perfil) a la derecha. */}
        <View style={estilos.barra}>
          <View style={estilos.logo}>
            <Feather name="home" size={20} color={colores.superficie} />
          </View>
          <Text style={[estilos.marca, estilos.flexible]}>NeighborGood</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir mi perfil"
            onPress={() => router.push('/residente/perfil')}
          >
            <Avatar nombre={perfil?.nombre} apellido={perfil?.apellido} />
          </Pressable>
        </View>

        <View>
          <Text style={estilos.saludo}>Hola, {perfil?.nombre} 👋</Text>
          {unidad.data ? <Text style={estilos.unidad}>{textoDeUnidad(unidad.data)}</Text> : null}
        </View>

        {/* Botón de pánico del mockup. El flujo de la alerta (P3) llega en el Sprint 5 (RF23). */}
        <View style={estilos.panico}>
          <View style={estilos.fila}>
            <View style={estilos.circuloPanico}>
              <Feather name="shield" size={30} color={colores.emergencia} />
            </View>
            <View style={estilos.flexible}>
              <Text style={estilos.tituloPanico}>Botón de pánico</Text>
              <Text style={estilos.textoPanico}>Avisa a la guardia y a tus vecinos</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/residente/alerta/tipo')}
            style={({ pressed }) => [estilos.botonPanico, pressed && estilos.presionado]}
          >
            <Text style={estilos.textoBotonPanico}>Enviar alerta de emergencia</Text>
          </Pressable>
        </View>

        <Text style={estilos.seccion}>Para ti hoy</Text>

        {conError ? (
          <Pressable accessibilityRole="button" onPress={recargar} style={estilos.aviso}>
            <Text style={estilos.textoAviso}>
              No pudimos cargar todas las novedades. Toca para reintentar.
            </Text>
          </Pressable>
        ) : null}

        {cargando ? (
          <ActivityIndicator color={colores.principal} style={estilos.indicador} />
        ) : sinNovedades ? (
          <EstadoVacio
            emoji="🎉"
            mensaje="Estás al día: no tienes avisos, encuestas ni visitas pendientes."
          />
        ) : (
          <>
            {aviso ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/residente/avisos')}
                style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionado]}
              >
                <IconoCuadro icono={iconoDeCategoria(aviso.categorias_aviso.nombre)} />
                <View style={estilos.cuerpo}>
                  <Text style={estilos.etiqueta}>Aviso · {aviso.categorias_aviso.nombre}</Text>
                  <Text style={estilos.titulo}>{aviso.titulo}</Text>
                  <Text style={estilos.detalle} numberOfLines={1}>
                    {aviso.descripcion}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colores.textoSecundario} />
              </Pressable>
            ) : null}

            {encuesta ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/residente/encuesta/[id]', params: { id: encuesta.id } })
                }
                style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionado]}
              >
                <IconoCuadro icono="check-square" color={chipsIncidencia.en_atencion} />
                <View style={estilos.cuerpo}>
                  <View style={estilos.fila}>
                    <Text style={[estilos.etiqueta, estilos.flexible]}>Encuesta</Text>
                    {encuesta.prioridad === 'alta' ? (
                      <Insignia texto="Obligatoria" color={chipsIncidencia.pendiente} />
                    ) : null}
                  </View>
                  <Text style={estilos.titulo}>{encuesta.titulo}</Text>
                  <Text style={estilos.detalle}>
                    Tu unidad aún no ha votado · cierra el {fechaYHora(encuesta.cierra_en)}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {visitasDeHoy.map((pase) => (
              <Pressable
                key={pase.id}
                accessibilityRole="button"
                onPress={() => router.push('/residente/visitas')}
                style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionado]}
              >
                <IconoCuadro icono="grid" />
                <View style={estilos.cuerpo}>
                  <Text style={estilos.titulo}>{pase.nombre_visitante}</Text>
                  <Text style={estilos.detalle}>
                    Visita de hoy
                    {pase.hora_estimada ? ` · ${horaLegible(pase.hora_estimada)}` : ''}
                  </Text>
                </View>
                <Insignia texto="Vigente" color={chipsPase.vigente} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  flexible: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Cuadro teal con la casita: la "marca" del mockup.
  logo: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.principal,
    borderRadius: 10,
  },
  marca: { ...tipografia.titulo, fontSize: 20, color: colores.principal },
  saludo: { ...tipografia.tituloPantalla, color: colores.texto },
  unidad: {
    ...tipografia.subtitulo,
    fontFamily: tipografia.cuerpo.fontFamily,
    color: colores.textoSecundario,
  },
  // Tarjeta roja del botón de pánico: es lo más visible de la pantalla (RNF4).
  panico: { padding: 20, gap: 16, backgroundColor: colores.emergencia, borderRadius: 20 },
  circuloPanico: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
  },
  tituloPanico: { ...tipografia.titulo, color: colores.superficie },
  textoPanico: { ...tipografia.cuerpo, color: colores.superficie },
  botonPanico: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radios.boton,
  },
  textoBotonPanico: { ...tipografia.subtitulo, color: colores.peligroTexto },
  seccion: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  indicador: { marginTop: 24 },
  aviso: {
    padding: 12,
    backgroundColor: chipsIncidencia.pendiente.fondo,
    borderRadius: radios.campo,
  },
  textoAviso: { ...tipografia.cuerpo, color: chipsIncidencia.pendiente.texto },
  tarjeta: {
    ...sombras.tarjeta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  presionado: { opacity: 0.85 },
  cuerpo: { flex: 1, gap: 2 },
  etiqueta: { ...tipografia.etiqueta, color: colores.principal },
  titulo: { ...tipografia.subtitulo, fontSize: 17, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
});

/**
 * Ruta `/directiva` (rol Directiva): pantalla P12 · Panel del mockup.
 *
 * Qué hace: resume el estado del condominio con lo que ya existe hasta el Sprint 4: cuántos residentes
 * activos, avisos vigentes y encuestas en curso hay; la participación de la encuesta en curso ("38 de
 * 60 unidades han votado") y el acceso a "Residentes habilitados" (alta y baja, RF5). También tiene
 * el botón para cerrar sesión, porque la directiva no tiene pestaña de perfil.
 * Lo que falta del mockup es del Sprint 5 y queda señalado en la propia pantalla: las alertas de hoy y
 * su historial (RF28), y las incidencias abiertas con su gráfica mensual (RF31).
 * Cómo funciona: reutiliza las consultas de las otras pantallas (residentes, avisos, encuestas y
 * unidades), así que comparte su caché y se actualiza cuando esas listas cambian.
 * Se usa con: `src/hooks/useResidentes.ts`, `useAvisos.ts`, `useEncuestas.ts`, `useAhora.ts`,
 * `useSesion`, los componentes `Avatar`, `Boton` e `Insignia`, el tema y la barra inferior de
 * `(tabs)/_layout.tsx`.
 */
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/componentes/Avatar';
import { Boton } from '@/componentes/formulario/Boton';
import { Insignia } from '@/componentes/Insignia';
import { useSesion } from '@/contexto/SesionContext';
import { useAhora } from '@/hooks/useAhora';
import { useAvisos } from '@/hooks/useAvisos';
import { useEncuestas } from '@/hooks/useEncuestas';
import { useAltasPendientes, useResidentesRegistrados, useUnidades } from '@/hooks/useResidentes';
import { chipsIncidencia, chipsPase, colores, espacios, radios, sombras, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/**
 * Cuadro con una cifra grande y su descripción ("3 · Residentes activos"); al tocarlo abre su lista.
 * `valor` es `null` mientras la consulta carga o si falló: se dibuja una raya.
 */
function Cifra({
  valor,
  texto,
  color,
  alPresionar,
}: {
  valor: number | null;
  texto: string;
  color: string;
  alPresionar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${valor ?? 'Sin dato'} ${texto}`}
      onPress={alPresionar}
      style={({ pressed }) => [estilos.cifra, pressed && estilos.presionado]}
    >
      <Text style={[estilos.numero, { color }]}>{valor ?? '–'}</Text>
      <Text style={estilos.detalle}>{texto}</Text>
    </Pressable>
  );
}

/** P12 · Panel de la directiva. */
export default function Panel() {
  const router = useRouter();
  const { perfil, cerrarSesion } = useSesion();
  const ahora = useAhora();
  const residentes = useResidentesRegistrados();
  const altas = useAltasPendientes();
  const avisos = useAvisos();
  const encuestas = useEncuestas();
  const unidades = useUnidades();

  const activos = residentes.data ? residentes.data.filter((r) => r.activo).length : null;
  // Vigente = ya empezó y todavía no termina (los programados no cuentan).
  const avisosVigentes = avisos.data
    ? avisos.data.filter(
        (a) =>
          new Date(a.vigente_desde).getTime() <= ahora &&
          new Date(a.vigente_hasta).getTime() > ahora,
      ).length
    : null;
  // En curso = ya abrió y todavía no cierra; la lista viene de la más reciente a la más antigua.
  const enCurso = (encuestas.data ?? []).filter(
    (e) => new Date(e.abre_en).getTime() <= ahora && new Date(e.cierra_en).getTime() > ahora,
  );
  const encuesta = enCurso[0];
  const pendientes = altas.data?.length ?? 0;

  // Participación de la encuesta en curso. Los votos son por unidad (RF9), así que se comparan con
  // las unidades del condominio; si la encuesta es por sector no se calcula el porcentaje.
  const votos = encuesta?.votos.length ?? 0;
  const totalUnidades = unidades.data?.length ?? 0;
  const conPorcentaje = Boolean(encuesta?.para_todos) && totalUnidades > 0;
  const porcentaje = conPorcentaje ? Math.min(100, Math.round((votos * 100) / totalUnidades)) : 0;

  /** Vuelve a pedir todas las cifras (deslizar hacia abajo). */
  function recargar() {
    residentes.refetch();
    altas.refetch();
    avisos.refetch();
    encuestas.refetch();
    unidades.refetch();
  }

  /** Abre una pantalla de la directiva. */
  const ir = (ruta: Href) => router.push(ruta);

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={residentes.isRefetching || avisos.isRefetching || encuestas.isRefetching}
            onRefresh={recargar}
          />
        }
      >
        <View style={estilos.fila}>
          <View style={estilos.flexible}>
            <Text style={estilos.titulo}>Panel</Text>
            <Text style={estilos.subtitulo}>Hola, {perfil?.nombre} 👋 · Directiva</Text>
          </View>
          <Avatar nombre={perfil?.nombre} apellido={perfil?.apellido} />
        </View>

        {/* Cifras del día con lo disponible hasta el Sprint 4. */}
        <View style={estilos.cifras}>
          <Cifra
            valor={activos}
            texto="Residentes activos"
            color={colores.principal}
            alPresionar={() => ir('/directiva/residentes')}
          />
          <Cifra
            valor={avisosVigentes}
            texto="Avisos vigentes"
            color={chipsIncidencia.pendiente.texto}
            alPresionar={() => ir('/directiva/avisos')}
          />
          <Cifra
            valor={encuestas.data ? enCurso.length : null}
            texto={enCurso.length === 1 ? 'Encuesta en curso' : 'Encuestas en curso'}
            color={chipsIncidencia.en_atencion.texto}
            alPresionar={() => ir('/directiva/encuestas')}
          />
        </View>

        {/* Encuesta en curso con su participación; al tocarla abre los resultados (P14b). */}
        {encuesta ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/directiva/encuestas/[id]/resultados',
                params: { id: encuesta.id },
              })
            }
            style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionado]}
          >
            <Text style={estilos.etiqueta}>Encuesta en curso 🗳️</Text>
            <Text style={estilos.tituloTarjeta}>{encuesta.titulo}</Text>
            <Text style={estilos.detalle}>Cierra el {fechaYHora(encuesta.cierra_en)}</Text>
            {conPorcentaje ? (
              <>
                {/* Pista gris con la barra teal del porcentaje de unidades que ya votaron. */}
                <View style={estilos.pista}>
                  <View style={[estilos.barra, { width: `${porcentaje}%` }]} />
                </View>
                <Text style={estilos.detalle}>
                  {votos} de {totalUnidades} unidades han votado · {porcentaje} %
                </Text>
              </>
            ) : (
              <Text style={estilos.detalle}>
                {votos} {votos === 1 ? 'unidad ha votado' : 'unidades han votado'}
              </Text>
            )}
          </Pressable>
        ) : null}

        {/* Accesos del mockup. El historial de alertas es del Sprint 5 y todavía no se abre. */}
        <View style={estilos.lista}>
          <Pressable
            accessibilityRole="button"
            onPress={() => ir('/directiva/residentes')}
            style={({ pressed }) => [estilos.renglon, pressed && estilos.presionado]}
          >
            <Feather name="users" size={22} color={colores.principal} />
            <Text style={[estilos.textoRenglon, estilos.flexible]}>Residentes habilitados</Text>
            {pendientes > 0 ? (
              <Insignia
                texto={`${pendientes} ${pendientes === 1 ? 'alta pendiente' : 'altas pendientes'}`}
                color={chipsIncidencia.pendiente}
              />
            ) : null}
            <Feather name="chevron-right" size={20} color={colores.textoSecundario} />
          </Pressable>
          <View style={estilos.separador} />
          <View
            accessibilityState={{ disabled: true }}
            style={[estilos.renglon, estilos.renglonInactivo]}
          >
            <Feather name="shield" size={22} color={colores.textoSecundario} />
            <Text style={[estilos.textoRenglon, estilos.flexible]}>Historial de alertas</Text>
            <Insignia texto="Sprint 5" color={chipsPase.usado} />
          </View>
        </View>

        <Text style={estilos.nota}>
          🚧 Las alertas de hoy y las incidencias abiertas con su gráfica mensual llegan en el
          Sprint 5.
        </Text>

        <Boton
          variante="peligro"
          icono="log-out"
          texto="Cerrar sesión"
          alPresionar={() =>
            cerrarSesion().catch((error) => console.error('No se pudo cerrar la sesión', error))
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  flexible: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { ...tipografia.tituloPantalla, color: colores.texto },
  subtitulo: { ...tipografia.cuerpo, fontSize: 15, color: colores.textoSecundario },
  cifras: { flexDirection: 'row', gap: 10 },
  // Cada cifra ocupa un tercio del ancho; el número grande lleva el color de su tema.
  cifra: {
    ...sombras.tarjeta,
    flex: 1,
    padding: 14,
    gap: 2,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  numero: { ...tipografia.tituloPantalla, fontSize: 30 },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 8,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  etiqueta: { ...tipografia.etiqueta, color: colores.principal },
  tituloTarjeta: { ...tipografia.subtitulo, fontSize: 17, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  pista: { height: 10, borderRadius: radios.chip, backgroundColor: colores.borde },
  barra: { height: 10, borderRadius: radios.chip, backgroundColor: colores.principal },
  // Lista de accesos: una sola tarjeta con renglones separados por una línea.
  lista: {
    ...sombras.tarjeta,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  renglon: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  renglonInactivo: { opacity: 0.6 },
  textoRenglon: { ...tipografia.subtitulo, color: colores.texto },
  separador: { height: 1, backgroundColor: colores.borde },
  nota: { ...tipografia.cuerpo, color: colores.textoSecundario },
  presionado: { opacity: 0.85 },
});

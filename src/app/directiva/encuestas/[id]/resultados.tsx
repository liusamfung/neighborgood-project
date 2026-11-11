/**
 * Ruta `/directiva/encuestas/[id]/resultados` (rol Directiva): pantalla P14b · Resultados. RF12.
 *
 * Qué hace: muestra la encuesta, cuántas unidades votaron y el conteo por opción con barras. La
 * directiva ve los resultados siempre, aunque la encuesta siga abierta y no sea "en vivo".
 * Cómo funciona: el conteo lo hace la función SQL `resultados_encuesta`, que no revela quién votó.
 * Deslizar hacia abajo vuelve a consultar para ver los votos nuevos.
 * Se usa con: `src/hooks/useEncuestas.ts`, `ResultadosEncuesta`, `Insignia`, `Boton`, el tema y
 * `directiva/_layout.tsx`, que la declara como pantalla apilada. Se llega desde la pestaña Encuestas.
 */
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResultadosEncuesta } from '@/componentes/encuestas/ResultadosEncuesta';
import { Boton } from '@/componentes/formulario/Boton';
import { Insignia } from '@/componentes/Insignia';
import { useEncuesta, useResultadosEncuesta } from '@/hooks/useEncuestas';
import { chipsIncidencia, chipsPase, colores, espacios, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/** P14b · Resultados de una encuesta para la directiva. */
export default function Resultados() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useEncuesta(id);
  const resultados = useResultadosEncuesta(id, true);

  /** Vuelve a pedir la encuesta y su conteo. */
  function recargar() {
    consulta.refetch();
    resultados.refetch();
  }

  if (consulta.isPending || resultados.isPending) {
    return <ActivityIndicator color={colores.principal} style={estilos.indicador} />;
  }
  const encuesta = consulta.data;
  if (consulta.isError || resultados.isError || !encuesta) {
    return (
      <View style={estilos.contenido}>
        <Text accessibilityRole="alert" style={estilos.error}>
          No pudimos cargar los resultados. Revisa tu conexión.
        </Text>
        <Boton variante="secundario" texto="Reintentar" alPresionar={recargar} />
      </View>
    );
  }

  const cerrada = new Date(encuesta.cierra_en).getTime() <= Date.now();
  const votos = encuesta.votos.length;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl
          refreshing={consulta.isRefetching || resultados.isRefetching}
          onRefresh={recargar}
        />
      }
    >
      <View style={estilos.insignias}>
        <Insignia texto={encuesta.categorias_aviso.nombre} />
        {encuesta.prioridad === 'alta' ? (
          <Insignia texto="Obligatoria" color={chipsIncidencia.pendiente} />
        ) : null}
        <Insignia
          texto={cerrada ? 'Cerrada' : 'Abierta'}
          color={cerrada ? chipsPase.usado : chipsPase.vigente}
        />
      </View>
      <Text style={estilos.titulo}>{encuesta.titulo}</Text>
      {encuesta.descripcion ? <Text style={estilos.texto}>{encuesta.descripcion}</Text> : null}
      <Text style={estilos.detalle}>
        {cerrada ? 'Cerró el ' : 'Cierra el '}
        {fechaYHora(encuesta.cierra_en)}
      </Text>
      <Text style={estilos.detalle}>
        {votos} {votos === 1 ? 'unidad votó' : 'unidades votaron'} ·{' '}
        {encuesta.resultados_en_vivo
          ? 'los residentes ven los resultados en vivo'
          : 'los residentes ven los resultados al cierre'}
      </Text>

      <ResultadosEncuesta preguntas={encuesta.encuesta_preguntas} conteos={resultados.data} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 12 },
  indicador: { marginTop: 48 },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  titulo: { ...tipografia.titulo, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

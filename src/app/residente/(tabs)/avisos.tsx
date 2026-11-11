/**
 * Ruta `/residente/avisos` (rol Residente): pantalla P4 · Avisos. RF10, RF11, RF13, RF14.
 *
 * Qué hace: lista los avisos y las encuestas dirigidos al residente. Se filtran por categoría (RF10) y
 * se separan en "Vigentes" e "Historial" (RF11): el historial reúne los avisos vencidos y las
 * encuestas cerradas. Una encuesta de prioridad alta lleva la insignia "Obligatoria" (RF14) y, al
 * tocarla, abre la pantalla para votar (P5).
 * Cómo funciona: no filtra por sector; la base ya entrega solo lo dirigido a todos o al sector del
 * residente (RLS, RF13). El filtro de categoría y el de vigencia se aplican en la app sobre esa lista.
 * Se usa con: `src/hooks/useAvisos.ts`, `src/hooks/useEncuestas.ts`, `src/hooks/useCatalogos.ts`,
 * `TarjetaAviso`, `TarjetaEncuesta`, `ChipsSeleccion`, `Boton` y el tema.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaAviso } from '@/componentes/avisos/TarjetaAviso';
import { TarjetaEncuesta } from '@/componentes/encuestas/TarjetaEncuesta';
import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useAvisos } from '@/hooks/useAvisos';
import { useCategorias } from '@/hooks/useCatalogos';
import { useEncuestas } from '@/hooks/useEncuestas';
import { colores, espacios, tipografia } from '@/tema';

// Las dos vistas de la lista (RF11).
const VISTAS = [
  { id: 'vigentes', texto: 'Vigentes' },
  { id: 'historial', texto: 'Historial' },
];

/** P4 · Avisos y encuestas del residente, con filtro por categoría e historial. */
export default function Avisos() {
  const router = useRouter();
  const avisos = useAvisos();
  const encuestas = useEncuestas();
  const categorias = useCategorias();
  // Vacío = todas las categorías.
  const [categoria, setCategoria] = useState<string[]>([]);
  const [vista, setVista] = useState('vigentes');

  const cargando = avisos.isPending || encuestas.isPending;
  const conError = avisos.isError || encuestas.isError;

  /** Vuelve a pedir avisos y encuestas (deslizar hacia abajo y botón "Reintentar"). */
  function recargar() {
    avisos.refetch();
    encuestas.refetch();
  }

  // Un aviso o encuesta es "vigente" mientras no pase su fecha de fin; después va al historial.
  const ahora = Date.now();
  const enHistorial = vista === 'historial';
  const deLaCategoria = (id: string) => categoria.length === 0 || categoria.includes(id);

  const encuestasVisibles = (encuestas.data ?? []).filter(
    (e) => deLaCategoria(e.categoria_id) && new Date(e.cierra_en).getTime() <= ahora === enHistorial,
  );
  const avisosVisibles = (avisos.data ?? []).filter(
    (a) =>
      deLaCategoria(a.categoria_id) && new Date(a.vigente_hasta).getTime() <= ahora === enHistorial,
  );
  const sinResultados = encuestasVisibles.length === 0 && avisosVisibles.length === 0;

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={avisos.isRefetching || encuestas.isRefetching}
            onRefresh={recargar}
          />
        }
      >
        <Text style={estilos.titulo}>Avisos</Text>

        <ChipsSeleccion
          etiqueta="Mostrar"
          opciones={VISTAS}
          seleccionados={[vista]}
          alCambiar={(ids) => setVista(ids[0] ?? 'vigentes')}
        />
        <ChipsSeleccion
          etiqueta="Categoría"
          textoVacio="Todas"
          opciones={(categorias.data ?? []).map((c) => ({ id: c.id, texto: c.nombre }))}
          seleccionados={categoria}
          alCambiar={setCategoria}
        />

        {cargando ? (
          <ActivityIndicator color={colores.principal} style={estilos.indicador} />
        ) : conError ? (
          <View style={estilos.lista}>
            <Text accessibilityRole="alert" style={estilos.error}>
              No pudimos cargar los avisos. Revisa tu conexión.
            </Text>
            <Boton variante="secundario" texto="Reintentar" alPresionar={recargar} />
          </View>
        ) : sinResultados ? (
          <Text style={estilos.vacio}>
            {enHistorial
              ? 'No hay avisos ni encuestas anteriores en esta categoría.'
              : 'No hay avisos ni encuestas vigentes en esta categoría.'}
          </Text>
        ) : (
          <View style={estilos.lista}>
            {/* Las encuestas van primero: piden una acción del residente. */}
            {encuestasVisibles.map((encuesta) => (
              <TarjetaEncuesta
                key={encuesta.id}
                encuesta={encuesta}
                rol="residente"
                alPresionar={() =>
                  router.push({ pathname: '/residente/encuesta/[id]', params: { id: encuesta.id } })
                }
              />
            ))}
            {avisosVisibles.map((aviso) => (
              <TarjetaAviso key={aviso.id} aviso={aviso} vencido={enHistorial} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  titulo: { ...tipografia.titulo, color: colores.texto },
  lista: { gap: espacios.entreTarjetas },
  indicador: { marginTop: 32 },
  vacio: { ...tipografia.cuerpo, color: colores.textoSecundario, paddingVertical: 16 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

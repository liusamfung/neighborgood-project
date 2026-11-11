/**
 * Ruta `/directiva/encuestas` (rol Directiva): Encuestas (sin mockup, ver docs/design/DISENO.md).
 * RF8 (acceso a "Crear encuesta"), RF11 (historial) y RF12 (acceso a los resultados).
 *
 * Qué hace: lista todas las encuestas, separadas en "Abiertas" (incluye las programadas) e "Historial"
 * (cerradas), con cuántas unidades votaron. Al tocar una abre sus resultados (P14b); el botón de
 * arriba abre el formulario para crear una (P14).
 * Se usa con: `src/hooks/useEncuestas.ts`, `TarjetaEncuesta`, `ChipsSeleccion`, `Boton`, el tema y la
 * barra inferior de `(tabs)/_layout.tsx`.
 */
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaEncuesta } from '@/componentes/encuestas/TarjetaEncuesta';
import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useAhora } from '@/hooks/useAhora';
import { useEncuestas } from '@/hooks/useEncuestas';
import { colores, espacios, tipografia } from '@/tema';

// Las dos vistas de la lista (RF11).
const VISTAS = [
  { id: 'abiertas', texto: 'Abiertas' },
  { id: 'historial', texto: 'Historial' },
];

/** Lista de encuestas de la directiva con acceso a "Crear encuesta" y a los resultados. */
export default function Encuestas() {
  const router = useRouter();
  const encuestas = useEncuestas();
  const [vista, setVista] = useState('abiertas');

  const enHistorial = vista === 'historial';
  const ahora = useAhora();
  const visibles = (encuestas.data ?? []).filter(
    (e) => new Date(e.cierra_en).getTime() <= ahora === enHistorial,
  );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={encuestas.isRefetching}
            onRefresh={() => void encuestas.refetch()}
          />
        }
      >
        <Text style={estilos.titulo}>Encuestas 🗳️</Text>
        <Boton
          icono="plus"
          texto="Crear encuesta"
          alPresionar={() => router.push('/directiva/encuestas/nueva')}
        />
        <ChipsSeleccion
          etiqueta="Mostrar"
          opciones={VISTAS}
          seleccionados={[vista]}
          alCambiar={(ids) => setVista(ids[0] ?? 'abiertas')}
        />

        {encuestas.isPending ? (
          <ActivityIndicator color={colores.principal} style={estilos.indicador} />
        ) : encuestas.isError ? (
          <View style={estilos.lista}>
            <Text accessibilityRole="alert" style={estilos.error}>
              No pudimos cargar las encuestas. Revisa tu conexión.
            </Text>
            <Boton
              variante="secundario"
              texto="Reintentar"
              alPresionar={() => encuestas.refetch()}
            />
          </View>
        ) : visibles.length === 0 ? (
          <EstadoVacio
            emoji="🗳️"
            mensaje={enHistorial ? 'No hay encuestas cerradas.' : 'No hay encuestas abiertas.'}
          />
        ) : (
          <View style={estilos.lista}>
            {visibles.map((encuesta) => (
              <TarjetaEncuesta
                key={encuesta.id}
                encuesta={encuesta}
                cerrada={enHistorial}
                rol="directiva"
                alPresionar={() =>
                  router.push({
                    pathname: '/directiva/encuestas/[id]/resultados',
                    params: { id: encuesta.id },
                  })
                }
              />
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
  titulo: { ...tipografia.tituloPantalla, color: colores.texto },
  lista: { gap: espacios.entreTarjetas },
  indicador: { marginTop: 32 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

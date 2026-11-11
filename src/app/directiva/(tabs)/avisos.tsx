/**
 * Ruta `/directiva/avisos` (rol Directiva): Avisos publicados (sin mockup, ver docs/design/DISENO.md).
 * RF7 (acceso a "Crear aviso") y RF11 (historial).
 *
 * Qué hace: lista todos los avisos publicados, separados en "Vigentes" (incluye los programados que
 * aún no empiezan) e "Historial" (vencidos), y abre el formulario para crear uno (P13).
 * Cómo funciona: la directiva puede leer todos los avisos (RLS); la lista se refresca sola cuando
 * `useCrearAviso` publica uno nuevo.
 * Se usa con: `src/hooks/useAvisos.ts`, `TarjetaAviso`, `ChipsSeleccion`, `Boton`, el tema y la barra
 * inferior de `(tabs)/_layout.tsx`.
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

import { TarjetaAviso } from '@/componentes/avisos/TarjetaAviso';
import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useAhora } from '@/hooks/useAhora';
import { useAvisos } from '@/hooks/useAvisos';
import { colores, espacios, tipografia } from '@/tema';

// Las dos vistas de la lista (RF11).
const VISTAS = [
  { id: 'vigentes', texto: 'Vigentes' },
  { id: 'historial', texto: 'Historial' },
];

/** Lista de avisos de la directiva con acceso a "Crear aviso". */
export default function Avisos() {
  const router = useRouter();
  const avisos = useAvisos();
  const [vista, setVista] = useState('vigentes');

  const enHistorial = vista === 'historial';
  const ahora = useAhora();
  const visibles = (avisos.data ?? []).filter(
    (a) => new Date(a.vigente_hasta).getTime() <= ahora === enHistorial,
  );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={avisos.isRefetching}
            onRefresh={() => void avisos.refetch()}
          />
        }
      >
        <Text style={estilos.titulo}>Avisos</Text>
        <Boton
          icono="plus"
          texto="Crear aviso"
          alPresionar={() => router.push('/directiva/avisos/nuevo')}
        />
        <ChipsSeleccion
          etiqueta="Mostrar"
          opciones={VISTAS}
          seleccionados={[vista]}
          alCambiar={(ids) => setVista(ids[0] ?? 'vigentes')}
        />

        {avisos.isPending ? (
          <ActivityIndicator color={colores.principal} style={estilos.indicador} />
        ) : avisos.isError ? (
          <View style={estilos.lista}>
            <Text accessibilityRole="alert" style={estilos.error}>
              No pudimos cargar los avisos. Revisa tu conexión.
            </Text>
            <Boton variante="secundario" texto="Reintentar" alPresionar={() => avisos.refetch()} />
          </View>
        ) : visibles.length === 0 ? (
          <EstadoVacio
            icono="bell"
            mensaje={enHistorial ? 'No hay avisos vencidos.' : 'No hay avisos vigentes.'}
          />
        ) : (
          <View style={estilos.lista}>
            {visibles.map((aviso) => (
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
  titulo: { ...tipografia.tituloPantalla, color: colores.texto },
  lista: { gap: espacios.entreTarjetas },
  indicador: { marginTop: 32 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

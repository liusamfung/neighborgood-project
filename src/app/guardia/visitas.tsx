/**
 * Ruta `/guardia/visitas` (rol Guardia): Visitas de hoy y registro de salida (sin mockup; RF20, Sprint 4).
 *
 * Qué hace: lista las visitas del día con su estado en la garita (esperada, adentro o salió) y las horas
 * exactas de ingreso y salida. Desde cada visita que está adentro, el guardia registra su salida (diagrama
 * 3.4). El ingreso se registra al escanear el QR en la pestaña Escáner (RF19).
 * Cómo funciona: la lista sale de `useVisitasDeHoy` (RLS solo deja al guardia ver los pases de hoy en
 * Lima) y se puede refrescar deslizando hacia abajo. Cada `TarjetaVisita` registra su salida con la Edge
 * Function `validar-pase` y la lista se vuelve a consultar.
 * Se usa con: `src/app/guardia/_layout.tsx` (pila del guardia) y el botón "Visitas de hoy y salidas" de
 * `src/app/guardia/(tabs)/escaner.tsx`.
 * Depende de: `src/hooks/useVisitasDeHoy.ts`, `TarjetaVisita` y el tema.
 */
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { TarjetaVisita } from '@/componentes/visitas/TarjetaVisita';
import { useVisitasDeHoy } from '@/hooks/useVisitasDeHoy';
import { colores, espacios, tipografia } from '@/tema';

/** Visitas de hoy del guardia, con el registro de salida (RF20). */
export default function VisitasDeHoy() {
  const visitas = useVisitasDeHoy();

  if (visitas.isPending) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.principal} />
      </View>
    );
  }
  if (visitas.isError) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.texto}>No pudimos cargar las visitas de hoy.</Text>
        <Boton texto="Reintentar" alPresionar={() => void visitas.refetch()} />
      </View>
    );
  }

  // Resumen de arriba: cuántas visitas siguen adentro del condominio ahora mismo.
  const adentro = visitas.data.filter((v) => v.ingreso_en && !v.salida_en).length;

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={visitas.data}
      keyExtractor={(visita) => visita.id}
      renderItem={({ item }) => <TarjetaVisita visita={item} />}
      refreshControl={
        <RefreshControl
          refreshing={visitas.isRefetching}
          onRefresh={() => void visitas.refetch()}
          colors={[colores.principal]}
        />
      }
      ListHeaderComponent={
        <Text style={estilos.resumen}>
          {adentro === 1 ? '1 visita adentro ahora' : `${adentro} visitas adentro ahora`}
        </Text>
      }
      ListEmptyComponent={<Text style={estilos.texto}>Hoy no hay visitas con pase.</Text>}
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: espacios.entreTarjetas },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: espacios.margenLateral,
    backgroundColor: colores.fondo,
  },
  resumen: { ...tipografia.subtitulo, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.textoSecundario, textAlign: 'center' },
});

/** RF12: permite elegir resultados de encuestas abiertas/cerradas, sin depender de la lista RF11. */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/formulario/Boton';
import { useEncuestasResultados } from '@/hooks/useResultadosEncuesta';
import { colores, espacios, radios, tipografia } from '@/tema';

/** Lista paginada con actualización al volver y reintento, respetando los sectores por RLS. */
export default function ElegirResultados() {
  const consulta = useEncuestasResultados();
  const router = useRouter();
  const { refetch } = consulta;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const filas = [...new Map(consulta.data?.pages.flat().map((f) => [f.id, f]) ?? []).values()];
  return (
    <View style={estilos.pantalla}>
      <Text accessibilityRole="header" style={estilos.titulo}>
        Resultados de encuestas
      </Text>
      {consulta.isPending ? <ActivityIndicator color={colores.principal} /> : null}
      {consulta.isError ? (
        <Text accessibilityRole="alert" style={estilos.texto}>
          No pudimos actualizar la lista.
        </Text>
      ) : null}
      <Boton
        texto={consulta.isError ? 'Reintentar' : 'Actualizar lista'}
        variante="secundario"
        cargando={consulta.isFetching}
        alPresionar={() => {
          void refetch();
        }}
      />
      <FlatList
        data={filas}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          !consulta.isPending && !consulta.isError ? (
            <Text style={estilos.texto}>Todavía no hay encuestas disponibles.</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            <Text style={estilos.texto}>
              Cierre:{' '}
              {new Date(item.cierra_en).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}
            </Text>
            <Boton
              texto={item.titulo}
              variante="secundario"
              alPresionar={() =>
                router.push({ pathname: '/residente/resultados/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        ListFooterComponent={
          consulta.hasNextPage ? (
            <Boton
              texto="Cargar más"
              variante="secundario"
              cargando={consulta.isFetchingNextPage}
              alPresionar={() => {
                void consulta.fetchNextPage();
              }}
            />
          ) : undefined
        }
      />
    </View>
  );
}
const estilos = StyleSheet.create({
  pantalla: { flex: 1, padding: espacios.margenLateral, gap: 16, backgroundColor: colores.fondo },
  titulo: { ...tipografia.titulo, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.textoSecundario },
  tarjeta: {
    padding: 12,
    gap: 8,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.superficie,
  },
});

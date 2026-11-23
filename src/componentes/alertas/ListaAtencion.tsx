/** RF27: acceso paginado a las alertas reales, compartido por personal y emisor.
 * Usa useListaAlertas bajo RLS y navega a la ruta protegida correspondiente a cada rol.
 */
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonCerrarSesion } from '@/componentes/BotonCerrarSesion';
import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { useListaAlertas } from '@/hooks/useAlertas';
import { ESTADO_ALERTA } from './DetalleAtencion';
import { colores, tipografia } from '@/tema';

/** Datos que recibe la lista. */
type Props = {
  /**
   * true cuando la lista es una pestaña de la barra inferior (la del guardia), que no tiene cabecera
   * propia: entonces se deja el alto de la barra de estado (hora, batería, isla dinámica) para que el
   * título no quede debajo de ella. Las pantallas apiladas (directiva y residente) ya traen cabecera.
   * Como esa pestaña tampoco tiene otro modo de salir de la cuenta, también muestra "Cerrar sesión".
   */
  esPestana?: boolean;
};

/** Mantiene historial accesible y permite recuperar errores o cargar más sin inventar alertas. */
export function ListaAtencion({ esPestana = false }: Props) {
  const consulta = useListaAlertas();
  const { perfil } = useSesion();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const filas = [...new Map(consulta.data?.pages.flat().map((f) => [f.id, f]) ?? []).values()];
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        paddingTop: esPestana ? top + 24 : 24,
        gap: 12,
        backgroundColor: colores.fondo,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text style={[tipografia.titulo, { flexShrink: 1 }]}>
          {perfil?.rol === 'residente' ? 'Mis alertas y respuestas' : 'Atención de alertas'}
        </Text>
        {esPestana ? <BotonCerrarSesion /> : null}
      </View>
      {consulta.isPending ? <ActivityIndicator /> : null}
      {consulta.isError ? (
        <Text accessibilityRole="alert">No pudimos actualizar las alertas.</Text>
      ) : null}
      <Boton
        texto={consulta.isError ? 'Reintentar' : 'Actualizar'}
        variante="secundario"
        cargando={consulta.isFetching}
        alPresionar={() => {
          void consulta.refetch();
        }}
      />
      <FlatList
        data={filas}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          !consulta.isPending && !consulta.isError ? (
            <Text>No hay alertas registradas.</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={{ gap: 8, padding: 16, backgroundColor: colores.superficie }}>
            <Text style={tipografia.subtitulo}>
              {ESTADO_ALERTA[item.estado]} · {item.tipo}
            </Text>
            <Text>
              {item.sector?.nombre} · Unidad {item.unidad?.codigo}
            </Text>
            <Text>
              {new Date(item.creada_en).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
            </Text>
            <Boton
              texto="Ver estado y respuestas"
              variante="secundario"
              alPresionar={() =>
                router.push({
                  pathname:
                    perfil?.rol === 'guardia'
                      ? '/guardia/alerta/[id]'
                      : perfil?.rol === 'directiva'
                        ? '/directiva/alerta/[id]'
                        : '/residente/alerta/estado/[id]',
                  params: { id: item.id },
                })
              }
            />
          </View>
        )}
        ListFooterComponent={
          consulta.hasNextPage ? (
            <Boton
              texto="Cargar más"
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

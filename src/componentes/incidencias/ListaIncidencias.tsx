/** RF30/P15: gestión de estados para directiva y seguimiento de solo lectura para residente.
 * Consulta useIncidencias, confirma cada cambio y conserva filtros y recuperación de errores.
 * Es el contenido de la pestaña Incidencias del residente y de la directiva. Las pestañas no tienen
 * cabecera (`headerShown: false`), así que deja el alto de la barra de estado (hora, batería, isla
 * dinámica) arriba del título, donde antes el título quedaba debajo de ella.
 * Conserva BotonCerrarSesion para la directiva, igual que sus demás pestañas reales.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonCerrarSesion } from '@/componentes/BotonCerrarSesion';
import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useSesion } from '@/contexto/SesionContext';
import { useIncidencias } from '@/hooks/useIncidencias';
import { ESTADO_INCIDENCIA, type EstadoIncidencia } from '@/tipos/incidencia';
import { colores, tipografia } from '@/tema';

/** No presenta el guardado como entrega de push: la notificación se procesa por separado en el servidor. */
export function ListaIncidencias() {
  const { perfil } = useSesion();
  const { top } = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<EstadoIncidencia>();
  const { consulta, cambiar } = useIncidencias(filtro);
  const [confirmacion, setConfirmacion] = useState<{
    id: string;
    anterior: EstadoIncidencia;
    version: string;
    estado: EstadoIncidencia;
  } | null>(null);
  const [mensaje, setMensaje] = useState('');
  const bloqueo = useRef(false);
  const filas = [...new Map(consulta.data?.pages.flat().map((f) => [f.id, f]) ?? []).values()];
  /** Evita doble toque y exige revisar la versión más reciente si otra persona la cambió. */
  async function confirmar() {
    if (!confirmacion || bloqueo.current || consulta.isFetching) return;
    bloqueo.current = true;
    setMensaje('');
    try {
      await cambiar.mutateAsync(confirmacion);
      setMensaje('Estado guardado. El aviso al residente se procesa por separado.');
    } catch {
      setMensaje('No se pudo confirmar el cambio. Actualiza y revisa el estado antes de repetir.');
    } finally {
      setConfirmacion(null);
      bloqueo.current = false;
    }
  }
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        paddingTop: top + 24,
        gap: 12,
        backgroundColor: colores.fondo,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[tipografia.titulo, { flex: 1 }]}>
          {perfil?.rol === 'directiva' ? 'Gestión de incidencias' : 'Mis incidencias'}
        </Text>
        {/* La pestaña real conserva la salida de directiva; el residente la mantiene en Perfil. */}
        {perfil?.rol === 'directiva' ? <BotonCerrarSesion /> : null}
      </View>
      {perfil?.rol === 'residente' ? (
        <Link href="/residente/incidencias/nueva">Reportar incidencia</Link>
      ) : null}
      <ChipsSeleccion
        etiqueta="Estado"
        opciones={Object.entries(ESTADO_INCIDENCIA).map(([id, texto]) => ({ id, texto }))}
        seleccionados={filtro ? [filtro] : []}
        textoVacio="Todos"
        alCambiar={([id]) => {
          setFiltro(id as EstadoIncidencia | undefined);
          setConfirmacion(null);
        }}
      />
      {consulta.isPending ? <ActivityIndicator /> : null}
      {consulta.isError ? (
        <Text accessibilityRole="alert">No pudimos actualizar las incidencias.</Text>
      ) : null}
      <Boton
        texto={consulta.isError ? 'Reintentar' : 'Actualizar lista'}
        variante="secundario"
        cargando={consulta.isFetching}
        alPresionar={() => {
          void consulta.refetch();
        }}
      />
      {mensaje ? <Text accessibilityLiveRegion="polite">{mensaje}</Text> : null}
      <FlatList
        data={filas}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          !consulta.isPending && !consulta.isError ? (
            <Text>No hay incidencias con este filtro.</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={{ gap: 12, backgroundColor: colores.superficie, padding: 16 }}>
            <Text style={tipografia.subtitulo}>
              {ESTADO_INCIDENCIA[item.estado]} · Unidad {item.unidad?.codigo}
            </Text>
            <Text>{item.descripcion}</Text>
            <Text>Lugar: {item.ubicacion}</Text>
            <Text>
              Actualizada:{' '}
              {new Date(item.actualizada_en).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
            </Text>
            {perfil?.rol === 'directiva' ? (
              confirmacion?.id === item.id ? (
                <>
                  <Text>
                    ¿Cambiar de {ESTADO_INCIDENCIA[confirmacion.anterior]} a{' '}
                    {ESTADO_INCIDENCIA[confirmacion.estado]}?
                  </Text>
                  <Boton
                    texto="Confirmar cambio"
                    cargando={cambiar.isPending}
                    deshabilitado={
                      consulta.isFetching ||
                      consulta.isError ||
                      item.actualizada_en !== confirmacion.version
                    }
                    alPresionar={() => {
                      void confirmar();
                    }}
                  />
                  <Boton
                    texto="Cancelar"
                    variante="secundario"
                    deshabilitado={cambiar.isPending}
                    alPresionar={() => setConfirmacion(null)}
                  />
                </>
              ) : (
                Object.entries(ESTADO_INCIDENCIA)
                  .filter(([e]) => e !== item.estado)
                  .map(([estado, texto]) => (
                    <Boton
                      key={estado}
                      texto={`Cambiar a ${texto}`}
                      variante="secundario"
                      deshabilitado={cambiar.isPending || consulta.isFetching || consulta.isError}
                      alPresionar={() =>
                        setConfirmacion({
                          id: item.id,
                          anterior: item.estado,
                          version: item.actualizada_en,
                          estado: estado as EstadoIncidencia,
                        })
                      }
                    />
                  ))
              )
            ) : null}
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

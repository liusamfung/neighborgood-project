/**
 * RF12/P14b: resultados agregados para residente y directiva con autorización del servidor.
 * Usa useResultadosEncuesta y el tema. Nunca dibuja resultados de una consulta rechazada.
 * Las barras comparan cantidades; no inventan porcentajes de unidades a partir de selecciones múltiples.
 */
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { useResultadosEncuesta } from '@/hooks/useResultadosEncuesta';
import { colores, espacios, radios, tipografia } from '@/tema';

/** Valida la ruta antes de consultar UUID y desmonta los datos al cambiar de encuesta. */
export function ResultadosEncuesta({ id }: { id: string | string[] | undefined }) {
  if (typeof id !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))
    return (
      <View style={estilos.contenido}>
        <Text style={estilos.texto}>La encuesta no está disponible.</Text>
      </View>
    );
  return <DetalleResultados key={id} id={id} />;
}

/** Distingue resultados reservados, sin votos, carga, error y actualización automática. */
function DetalleResultados({ id }: { id: string }) {
  const { perfil } = useSesion();
  const { consulta, conectada } = useResultadosEncuesta(id);
  const margenes = useSafeAreaInsets();
  const datos = consulta.data;
  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: margenes.bottom + 24 }]}
    >
      {consulta.isPending ? (
        <ActivityIndicator accessibilityLabel="Cargando resultados" color={colores.principal} />
      ) : consulta.isError ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          No pudimos actualizar los resultados. Revisa tu conexión.
        </Text>
      ) : !datos ? (
        <Text style={estilos.texto}>La encuesta no existe o no está dirigida a tu sector.</Text>
      ) : (
        <>
          <Text accessibilityRole="header" style={estilos.titulo}>
            {datos.encuesta.titulo}
          </Text>
          <Text style={estilos.texto}>
            Cierre:{' '}
            {new Date(datos.encuesta.cierra_en).toLocaleString('es-PE', {
              timeZone: 'America/Lima',
            })}
          </Text>
          {!datos.permitido ? (
            <Text style={estilos.aviso}>
              Los resultados no están disponibles todavía. Si están reservados, se publicarán al
              cierre.
            </Text>
          ) : (
            <>
              <Text style={estilos.aviso}>
                {conectada
                  ? 'Actualización automática conectada.'
                  : 'Actualización periódica; también puedes actualizar ahora.'}
              </Text>
              {perfil?.rol === 'directiva' && !datos.encuesta.resultados_en_vivo ? (
                <Text style={estilos.texto}>
                  Vista de la directiva. Los residentes acceden a los resultados al cierre.
                </Text>
              ) : null}
              <Text style={estilos.texto}>
                Las barras comparan cantidades por opción. En preguntas múltiples una unidad puede
                elegir varias respuestas.
              </Text>
              {datos.preguntas.map((p, indice) => {
                const maximo = Math.max(0, ...p.opciones.map((o) => o.total));
                return (
                  <View key={p.id} style={estilos.tarjeta}>
                    <Text style={estilos.texto}>
                      PREGUNTA {indice + 1} ·{' '}
                      {p.seleccion === 'multiple' ? 'VARIAS RESPUESTAS' : 'UNA RESPUESTA'}
                    </Text>
                    <Text accessibilityRole="header" style={estilos.subtitulo}>
                      {p.texto}
                    </Text>
                    {maximo === 0 ? (
                      <Text style={estilos.texto}>Aún no hay selecciones registradas.</Text>
                    ) : null}
                    {p.opciones.map((o) => (
                      <View
                        key={o.id}
                        accessible
                        accessibilityLabel={`${o.texto}: ${o.total} selecciones`}
                        style={estilos.opcion}
                      >
                        <Text style={estilos.texto}>
                          {o.texto}: {o.total}
                        </Text>
                        <View style={estilos.barraFondo}>
                          <View
                            style={[
                              estilos.barra,
                              {
                                width: `${maximo > 0 ? Math.round((o.total / maximo) * 100) : 0}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
      <Boton
        texto={consulta.isError ? 'Reintentar' : 'Actualizar resultados'}
        variante="secundario"
        cargando={consulta.isFetching}
        alPresionar={() => {
          void consulta.refetch();
        }}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: {
    padding: espacios.margenLateral,
    gap: 16,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  titulo: { ...tipografia.titulo, color: colores.texto },
  subtitulo: { ...tipografia.subtitulo, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  aviso: {
    ...tipografia.cuerpo,
    color: colores.principal,
    backgroundColor: colores.suave,
    padding: 12,
    borderRadius: 12,
  },
  tarjeta: {
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  opcion: { gap: 6 },
  barraFondo: { height: 12, backgroundColor: colores.borde, borderRadius: 6, overflow: 'hidden' },
  barra: { height: 12, backgroundColor: colores.principal, borderRadius: 6 },
});

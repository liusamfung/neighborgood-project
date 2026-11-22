/** RF27/P10: detalle compartido para guardia, directiva y emisor.
 * Usa useDetalleAlerta: lee el estado persistido y confirma cada respuesta antes de registrarla.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { useDetalleAlerta } from '@/hooks/useAlertas';
import { colores, tipografia } from '@/tema';

export const ESTADO_ALERTA = {
  activa: 'Activa',
  en_camino: 'Personal en camino',
  atendida: 'Atendida',
};
const TIPO = { medica: 'Médica', seguridad: 'Seguridad', incendio: 'Incendio' };

/** Descarta parámetros inválidos antes de consultar Supabase. */
export function DetalleAtencion({ id }: { id: unknown }) {
  if (typeof id !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))
    return <Text>Alerta no disponible.</Text>;
  return <Detalle key={id} id={id} />;
}

/** El emisor solo consulta; personal autorizado confirma una transición sin actualizar optimistamente. */
function Detalle({ id }: { id: string }) {
  const { perfil } = useSesion();
  const { consulta, responder } = useDetalleAlerta(id);
  const [confirmar, setConfirmar] = useState<'en_camino' | 'atendida' | null>(null);
  const bloqueo = useRef(false);
  const datos = consulta.data;
  const accion =
    datos?.alerta.estado === 'activa'
      ? 'en_camino'
      : datos?.alerta.estado === 'en_camino'
        ? 'atendida'
        : null;
  const personal = perfil?.rol === 'guardia' || perfil?.rol === 'directiva';
  /** Una sola petición; si falla se recupera el estado antes de ofrecer otra respuesta. */
  async function enviar() {
    if (!confirmar || bloqueo.current || consulta.isFetching) return;
    bloqueo.current = true;
    try {
      await responder.mutateAsync(confirmar);
      setConfirmar(null);
    } catch {
      setConfirmar(null);
    } finally {
      bloqueo.current = false;
    }
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}
    >
      {consulta.isPending ? (
        <ActivityIndicator />
      ) : consulta.isError ? (
        <Text accessibilityRole="alert">
          No se pudo recuperar el estado. Actualiza antes de responder.
        </Text>
      ) : !datos ? (
        <Text>Alerta inexistente o sin acceso.</Text>
      ) : (
        <>
          <Text accessibilityRole="header" style={{ ...tipografia.titulo, color: colores.texto }}>
            Alerta: {TIPO[datos.alerta.tipo]}
          </Text>
          <Text style={tipografia.subtitulo}>
            {datos.alerta.sector?.nombre} · Unidad {datos.alerta.unidad?.codigo}
          </Text>
          <Text accessibilityLiveRegion="polite" style={tipografia.subtitulo}>
            {ESTADO_ALERTA[datos.alerta.estado]}
          </Text>
          <Text>
            {new Date(datos.alerta.creada_en).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
          </Text>
          <Text>La bitácora registra las respuestas del personal.</Text>
          {datos.atenciones.map((a) => (
            <Text key={a.id}>
              {ESTADO_ALERTA[a.estado]} ·{' '}
              {new Date(a.creado_en).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
              {a.usuario_id === perfil?.id ? ' · Tú' : ' · Personal autorizado'}
            </Text>
          ))}
          {personal && accion ? (
            confirmar ? (
              <View style={{ gap: 12 }}>
                <Text>
                  ¿Confirmas{' '}
                  {confirmar === 'en_camino' ? 'que estás en camino' : 'que la alerta fue atendida'}
                  ?
                </Text>
                <Boton
                  texto="Confirmar respuesta"
                  cargando={responder.isPending}
                  deshabilitado={consulta.isFetching || confirmar !== accion}
                  alPresionar={() => {
                    void enviar();
                  }}
                />
                <Boton
                  texto="Cancelar"
                  variante="secundario"
                  deshabilitado={responder.isPending}
                  alPresionar={() => setConfirmar(null)}
                />
              </View>
            ) : (
              <Boton
                texto={accion === 'en_camino' ? 'Estoy en camino' : 'Marcar como atendida'}
                deshabilitado={consulta.isFetching || responder.isPending}
                alPresionar={() => {
                  responder.reset();
                  setConfirmar(accion);
                }}
              />
            )
          ) : null}
        </>
      )}
      {responder.isError ? (
        <Text accessibilityRole="alert">
          No pudimos confirmar la respuesta. Se consultó nuevamente el estado; revisa si ya quedó
          registrada antes de volver a intentar.
        </Text>
      ) : null}
      <Boton
        texto="Actualizar estado"
        variante="secundario"
        cargando={consulta.isFetching}
        alPresionar={() => {
          void consulta.refetch();
        }}
      />
    </ScrollView>
  );
}

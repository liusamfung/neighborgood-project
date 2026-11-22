/**
 * Ruta `/residente/encuesta/[id]` (rol Residente): pantalla P5 · Encuesta del mockup.
 * RF9: responde todas las preguntas y confirma un voto por unidad mediante la RPC existente.
 * Usa SesionContext, useVotacion, PreguntaVoto y reglas puras; no accede directamente a Supabase.
 * El layout residente declara esta pantalla apilada y la lista de avisos permite abrirla.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PreguntaVoto } from '@/componentes/encuestas/PreguntaVoto';
import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { useVotacion } from '@/hooks/useVotacion';
import { colores, espacios, radios, tipografia } from '@/tema';
import type { SeleccionesVoto } from '@/tipos/votacion';
import {
  alternarRespuesta,
  encuestaAbierta,
  idEncuestaValido,
  mensajeErrorVoto,
  prepararVoto,
} from '@/utilidades/votacion';

/** Valida la ruta y reinicia el borrador cuando se abre otra encuesta en la misma pila. */
export default function Encuesta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  if (!idEncuestaValido(id))
    return (
      <View style={estilos.contenido}>
        <Text style={estilos.texto}>La encuesta no está disponible.</Text>
        <Boton texto="Volver a avisos" alPresionar={() => router.replace('/residente/avisos')} />
      </View>
    );
  return <DetalleVotacion key={id} id={id} />;
}

/** P5: conserva respuestas ante un fallo, bloquea dobles envíos y distingue la votación ya registrada. */
function DetalleVotacion({ id }: { id: string }) {
  const { perfil } = useSesion();
  const usuarioId = perfil?.id;
  const unidadId = perfil?.unidad_id;
  const { consulta, envio } = useVotacion(id, usuarioId, unidadId);
  const { refetch } = consulta;
  const margenes = useSafeAreaInsets();
  const [selecciones, setSelecciones] = useState<SeleccionesVoto>({});
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const enviando = useRef(false);
  const encuesta = consulta.data?.encuesta;
  const yaVoto = Boolean(consulta.data?.votada || envio.isSuccess);
  const abierta = Boolean(encuesta && encuestaAbierta(encuesta.abre_en, encuesta.cierra_en, ahora));

  // Una pestaña/otra app puede haber cambiado el voto de la unidad mientras esta ruta seguía montada.
  useFocusEffect(
    useCallback(() => {
      setAhora(Date.now());
      if (usuarioId && unidadId) void refetch();
    }, [usuarioId, unidadId, refetch]),
  );

  // Actualiza la disponibilidad al llegar a una fecha límite, sin sondear continuamente el servidor.
  useEffect(() => {
    if (!encuesta) return;
    const proxima = [Date.parse(encuesta.abre_en), Date.parse(encuesta.cierra_en)]
      .filter((fecha) => fecha > Date.now())
      .sort((a, b) => a - b)[0];
    if (!proxima) return;
    const temporizador = setTimeout(
      () => setAhora(Date.now()),
      Math.min(proxima - Date.now() + 20, 2_147_483_647),
    );
    return () => clearTimeout(temporizador);
  }, [encuesta, ahora]);

  /** Valida todas las preguntas antes de mostrar una confirmación; aún no escribe nada. */
  function revisar() {
    if (!encuesta) return;
    setError(null);
    try {
      prepararVoto(encuesta.preguntas, selecciones);
      setConfirmando(true);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'Revisa tus respuestas.');
    }
  }

  /** Revisa el plazo otra vez y espera la transacción antes de afirmar que se registró el voto. */
  async function enviar() {
    if (!encuesta || enviando.current || yaVoto) return;
    if (!encuestaAbierta(encuesta.abre_en, encuesta.cierra_en)) {
      setAhora(Date.now());
      setConfirmando(false);
      setError('La encuesta ya no está abierta.');
      return;
    }
    enviando.current = true;
    setError(null);
    try {
      await envio.mutateAsync(prepararVoto(encuesta.preguntas, selecciones));
      setConfirmando(false);
    } catch (fallo) {
      setConfirmando(false);
      setError(mensajeErrorVoto(fallo));
    } finally {
      enviando.current = false;
    }
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: margenes.bottom + 24 }]}
    >
      {!perfil?.unidad_id ? (
        <Text style={estilos.error}>Tu perfil necesita una unidad asignada para votar.</Text>
      ) : consulta.isPending ? (
        <ActivityIndicator accessibilityLabel="Cargando encuesta" color={colores.principal} />
      ) : consulta.isError ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          No pudimos actualizar la encuesta. Comprueba tu conexión.
        </Text>
      ) : !encuesta ? (
        <Text style={estilos.texto}>La encuesta no existe o no está dirigida a tu sector.</Text>
      ) : (
        <>
          <Text accessibilityRole="header" style={estilos.titulo}>
            {encuesta.titulo}
          </Text>
          {encuesta.prioridad === 'alta' ? <Text style={estilos.aviso}>Obligatoria</Text> : null}
          <Text style={estilos.texto}>
            Cierra:{' '}
            {new Date(encuesta.cierra_en).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
          </Text>
          {encuesta.descripcion ? <Text style={estilos.texto}>{encuesta.descripcion}</Text> : null}
          {yaVoto ? (
            <Text accessibilityLiveRegion="polite" style={estilos.aviso}>
              {envio.isSuccess ? 'Voto registrado. ' : ''}Tu unidad ya votó en esta encuesta.
            </Text>
          ) : !abierta ? (
            <Text style={estilos.aviso}>La encuesta no está abierta para votar.</Text>
          ) : (
            <>
              <Text style={estilos.aviso}>
                Se registra un voto por unidad. Responde todas las preguntas.
              </Text>
              {encuesta.preguntas.map((pregunta, indice) => (
                <PreguntaVoto
                  key={pregunta.id}
                  pregunta={pregunta}
                  indice={indice}
                  elegidas={selecciones[pregunta.id] ?? []}
                  bloqueada={confirmando || envio.isPending}
                  alElegir={(opcionId) => {
                    setSelecciones((actual) => alternarRespuesta(actual, pregunta, opcionId));
                    setError(null);
                  }}
                />
              ))}
              {confirmando ? (
                <View style={estilos.confirmacion}>
                  <Text style={estilos.texto}>
                    ¿Enviar estas respuestas? Tu unidad no podrá registrar otro voto.
                  </Text>
                  <Boton
                    texto="Confirmar y enviar"
                    cargando={envio.isPending}
                    alPresionar={enviar}
                  />
                  <Boton
                    texto="Revisar respuestas"
                    variante="secundario"
                    deshabilitado={envio.isPending}
                    alPresionar={() => setConfirmando(false)}
                  />
                </View>
              ) : (
                <Boton
                  texto="Enviar voto"
                  deshabilitado={consulta.isFetching || !encuesta.preguntas.length}
                  alPresionar={revisar}
                />
              )}
            </>
          )}
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      ) : null}
      <Boton
        texto={consulta.isError ? 'Reintentar' : 'Actualizar encuesta'}
        variante="secundario"
        cargando={consulta.isFetching}
        deshabilitado={!perfil?.unidad_id || envio.isPending}
        alPresionar={() => {
          void refetch();
          setAhora(Date.now());
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
  texto: { ...tipografia.cuerpo, color: colores.textoSecundario },
  aviso: {
    ...tipografia.cuerpo,
    color: colores.principal,
    backgroundColor: colores.suave,
    padding: 12,
    borderRadius: 12,
  },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  confirmacion: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colores.principal,
    borderRadius: radios.tarjeta,
  },
});

/**
 * Ruta `/residente/encuesta/[id]` (rol Residente): pantalla P5 · Encuesta (votar). RF9, RF12, RF14.
 *
 * Qué hace: muestra la encuesta con sus preguntas, como en el mockup P5: cada pregunta dice si se
 * elige una opción o varias, y un recuadro recuerda que se registra un voto por unidad. Si está
 * abierta y la unidad aún no votó, deja elegir las opciones y enviar el voto (RF9). Si la unidad ya
 * votó o la encuesta cerró, lo indica en vez del formulario. Los resultados aparecen cuando la
 * encuesta es "en vivo" o ya cerró, y mientras sigue abierta se actualizan solos (RF12).
 * Cómo funciona: el voto lo registra la función SQL `emitir_voto`, que valida todo de nuevo en la
 * base; si otro miembro de la unidad votó primero, responde "Tu unidad ya votó en esta encuesta". Al
 * votar, el formulario se reemplaza de inmediato por la confirmación: no se puede enviar dos veces.
 * Se usa con: `src/hooks/useEncuestas.ts`, `src/hooks/useResidentes.ts` (`useUnidad`),
 * `src/repositorios/encuestas.ts` (tipos y mensajes), `useSesion`, `useMensaje`, `ResultadosEncuesta`,
 * `Insignia`, `Boton`, el tema y `residente/_layout.tsx`, que registra la ruta.
 */
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResultadosEncuesta } from '@/componentes/encuestas/ResultadosEncuesta';
import { Boton } from '@/componentes/formulario/Boton';
import { Insignia } from '@/componentes/Insignia';
import { useMensaje } from '@/contexto/MensajeContext';
import { useSesion } from '@/contexto/SesionContext';
import { useAhora } from '@/hooks/useAhora';
import { useEmitirVoto, useEncuesta, useResultadosEncuesta } from '@/hooks/useEncuestas';
import { useUnidad } from '@/hooks/useResidentes';
import {
  mensajeDeErrorVoto,
  type OpcionElegida,
  type PreguntaEncuesta,
} from '@/repositorios/encuestas';
import { textoDeUnidad } from '@/repositorios/residentes';
import { chipsIncidencia, colores, espacios, radios, sombras, tamanos, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/**
 * Marca de una opción: círculo (selección única) o casilla (selección múltiple), rellena si está
 * elegida. Es solo el dibujo; el toque lo recibe la fila completa.
 */
function Marca({ multiple, marcada }: { multiple: boolean; marcada: boolean }) {
  if (multiple) {
    return (
      <View style={[estilos.casilla, marcada && estilos.casillaMarcada]}>
        {marcada ? <Feather name="check" size={16} color={colores.superficie} /> : null}
      </View>
    );
  }
  return (
    <View style={[estilos.circulo, marcada && estilos.circuloMarcado]}>
      {marcada ? <View style={estilos.punto} /> : null}
    </View>
  );
}

/** P5 · Votar una encuesta y ver sus resultados. */
export default function Encuesta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useSesion();
  const { mostrarMensaje } = useMensaje();
  const ahora = useAhora();
  const consulta = useEncuesta(id);
  const voto = useEmitirVoto(id);
  const unidad = useUnidad(perfil?.unidad_id);
  // Opciones marcadas por pregunta: id de la pregunta → ids de las opciones elegidas.
  const [elegidas, setElegidas] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const encuesta = consulta.data;
  const cerrada = encuesta ? new Date(encuesta.cierra_en).getTime() <= ahora : false;
  // `voto.isSuccess` cubre el instante entre votar y recibir la encuesta actualizada: el formulario
  // desaparece en cuanto la base acepta el voto.
  const yaVoto = (encuesta?.votos.length ?? 0) > 0 || voto.isSuccess;
  // RF12: el residente ve resultados si son en vivo o si la encuesta ya cerró.
  const verResultados = Boolean(encuesta?.resultados_en_vivo) || (Boolean(encuesta) && cerrada);
  const resultados = useResultadosEncuesta(id, verResultados, verResultados && !cerrada);

  /** Marca o desmarca una opción: en selección única reemplaza, en múltiple alterna. */
  function alternar(pregunta: PreguntaEncuesta, opcionId: string) {
    setElegidas((actual) => {
      const marcadas = actual[pregunta.id] ?? [];
      const nuevas =
        pregunta.seleccion === 'unica'
          ? [opcionId]
          : marcadas.includes(opcionId)
            ? marcadas.filter((o) => o !== opcionId)
            : [...marcadas, opcionId];
      return { ...actual, [pregunta.id]: nuevas };
    });
  }

  /** Comprueba que todas las preguntas tengan respuesta y envía el voto. */
  function enviar() {
    if (!encuesta) return;
    setError(null);
    const sinResponder = encuesta.encuesta_preguntas.some((p) => !elegidas[p.id]?.length);
    if (sinResponder) return setError('Responde todas las preguntas antes de enviar.');
    const opciones: OpcionElegida[] = encuesta.encuesta_preguntas.flatMap((p) =>
      elegidas[p.id].map((opcionId) => ({ pregunta_id: p.id, opcion_id: opcionId })),
    );
    voto.mutate(opciones, {
      onSuccess: () => mostrarMensaje('🗳️ Voto registrado. ¡Gracias por participar!'),
      onError: (e) => {
        setError(mensajeDeErrorVoto(e));
        // Si la unidad ya había votado o la encuesta cerró, la pantalla se pone al día.
        consulta.refetch();
      },
    });
  }

  if (consulta.isPending) {
    return <ActivityIndicator color={colores.principal} style={estilos.indicador} />;
  }
  if (consulta.isError || !encuesta) {
    return (
      <View style={estilos.contenido}>
        <Text accessibilityRole="alert" style={estilos.error}>
          {consulta.isError
            ? 'No pudimos cargar la encuesta. Revisa tu conexión.'
            : 'Esta encuesta no existe o no está dirigida a tu sector.'}
        </Text>
        {consulta.isError ? (
          <Boton variante="secundario" texto="Reintentar" alPresionar={() => consulta.refetch()} />
        ) : null}
      </View>
    );
  }

  const puedeVotar = !cerrada && !yaVoto;

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <View style={estilos.insignias}>
        {encuesta.prioridad === 'alta' ? (
          <Insignia texto="Obligatoria" color={chipsIncidencia.pendiente} />
        ) : null}
        <Insignia texto={encuesta.categorias_aviso.nombre} />
        <Text style={estilos.detalle}>
          {cerrada ? 'Cerró el ' : 'Cierra el '}
          {fechaYHora(encuesta.cierra_en)}
        </Text>
      </View>
      <Text style={estilos.titulo}>{encuesta.titulo}</Text>
      {encuesta.descripcion ? <Text style={estilos.texto}>{encuesta.descripcion}</Text> : null}

      {yaVoto ? (
        <Text style={estilos.aviso}>✅ Tu unidad ya votó en esta encuesta.</Text>
      ) : cerrada ? (
        <Text style={estilos.aviso}>⏰ La encuesta ya cerró. Tu unidad no votó.</Text>
      ) : null}

      {puedeVotar ? (
        <>
          {encuesta.encuesta_preguntas.map((pregunta, indice) => {
            const multiple = pregunta.seleccion === 'multiple';
            return (
              <View key={pregunta.id} style={estilos.tarjeta}>
                <Text style={estilos.etiqueta}>
                  Pregunta {indice + 1} · {multiple ? 'Elige una o más' : 'Elige una'}
                </Text>
                <Text style={estilos.pregunta}>{pregunta.texto}</Text>
                {pregunta.encuesta_opciones.map((opcion) => {
                  const marcada = (elegidas[pregunta.id] ?? []).includes(opcion.id);
                  return (
                    <Pressable
                      key={opcion.id}
                      accessibilityRole={multiple ? 'checkbox' : 'radio'}
                      accessibilityState={{ checked: marcada }}
                      onPress={() => alternar(pregunta, opcion.id)}
                      style={estilos.opcion}
                    >
                      <Marca multiple={multiple} marcada={marcada} />
                      <Text style={[estilos.textoOpcion, estilos.flexible]}>{opcion.texto}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}

          {/* Recuadro del mockup: recuerda que el voto es de la unidad, no de la persona (RF9). */}
          <Text style={estilos.aviso}>
            Se registra un voto por unidad.
            {unidad.data ? ` Estás votando por ${textoDeUnidad(unidad.data)}.` : ''}
          </Text>

          {error ? (
            <Text accessibilityRole="alert" style={estilos.error}>
              {error}
            </Text>
          ) : null}
          <Boton icono="send" texto="Enviar voto" alPresionar={enviar} cargando={voto.isPending} />
        </>
      ) : null}

      {verResultados ? (
        <View style={estilos.seccion}>
          <Text style={estilos.subtitulo}>
            {cerrada ? 'Resultados 📊' : 'Resultados en vivo 📊'}
          </Text>
          {resultados.isPending ? (
            <ActivityIndicator color={colores.principal} />
          ) : resultados.isError ? (
            <Text style={estilos.error}>No pudimos cargar los resultados.</Text>
          ) : (
            <ResultadosEncuesta preguntas={encuesta.encuesta_preguntas} conteos={resultados.data} />
          )}
        </View>
      ) : (
        <Text style={estilos.detalle}>
          📊 Los resultados se publican cuando cierre la encuesta.
        </Text>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  flexible: { flex: 1 },
  indicador: { marginTop: 48 },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  titulo: { ...tipografia.tituloPantalla, fontSize: 24, color: colores.texto },
  subtitulo: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  texto: { ...tipografia.cuerpo, fontSize: 15, color: colores.textoSecundario },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  aviso: {
    ...tipografia.cuerpo,
    fontSize: 15,
    padding: 14,
    color: colores.principal,
    backgroundColor: colores.suave,
    borderRadius: radios.campo,
    overflow: 'hidden',
  },
  seccion: { gap: espacios.entreTarjetas },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 6,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  etiqueta: { ...tipografia.etiqueta, color: colores.principal },
  pregunta: { ...tipografia.subtitulo, fontSize: 17, color: colores.texto },
  // Cada opción mide al menos 52 px de alto para que sea fácil de tocar (RNF8).
  opcion: {
    minHeight: tamanos.alturaBotonMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textoOpcion: { ...tipografia.cuerpo, fontSize: 16, color: colores.texto },
  // Selección única: círculo con un punto teal cuando está elegido.
  circulo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.textoSecundario,
  },
  circuloMarcado: { borderColor: colores.principal },
  punto: { width: 12, height: 12, borderRadius: 6, backgroundColor: colores.principal },
  // Selección múltiple: casilla que se rellena de teal con un check.
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.textoSecundario,
  },
  casillaMarcada: { borderColor: colores.principal, backgroundColor: colores.principal },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

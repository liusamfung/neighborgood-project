/**
 * Ruta `/residente/encuesta/[id]` (rol Residente): pantalla P5 · Encuesta (votar). RF9, RF12, RF14.
 *
 * Qué hace: muestra la encuesta con sus preguntas. Si está abierta y la unidad aún no votó, deja
 * elegir las opciones y enviar el voto (uno por unidad, RF9). Si la unidad ya votó o la encuesta
 * cerró, muestra el aviso correspondiente. Los resultados aparecen cuando la encuesta es "en vivo" o
 * ya cerró (RF12).
 * Cómo funciona: el voto lo registra la función SQL `emitir_voto`, que valida todo de nuevo en la
 * base; si otro miembro de la unidad votó primero, responde con "Tu unidad ya votó en esta encuesta".
 * Se usa con: `src/hooks/useEncuestas.ts`, `src/repositorios/encuestas.ts` (tipos y mensajes),
 * `ResultadosEncuesta`, `Insignia`, `Boton`, el tema y `residente/_layout.tsx`, que registra la ruta.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResultadosEncuesta } from '@/componentes/encuestas/ResultadosEncuesta';
import { Boton } from '@/componentes/formulario/Boton';
import { Insignia } from '@/componentes/Insignia';
import { useAhora } from '@/hooks/useAhora';
import { useEmitirVoto, useEncuesta, useResultadosEncuesta } from '@/hooks/useEncuestas';
import {
  mensajeDeErrorVoto,
  type OpcionElegida,
  type PreguntaEncuesta,
} from '@/repositorios/encuestas';
import { chipsIncidencia, colores, espacios, radios, sombras, tamanos, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/** P5 · Votar una encuesta y ver sus resultados. */
export default function Encuesta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useEncuesta(id);
  const voto = useEmitirVoto(id);
  // Opciones marcadas por pregunta: id de la pregunta → ids de las opciones elegidas.
  const [elegidas, setElegidas] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const ahora = useAhora();
  const encuesta = consulta.data;
  const cerrada = encuesta ? new Date(encuesta.cierra_en).getTime() <= ahora : false;
  const yaVoto = (encuesta?.votos.length ?? 0) > 0;
  // RF12: el residente ve resultados si son en vivo o si la encuesta ya cerró.
  const verResultados = Boolean(encuesta) && (encuesta!.resultados_en_vivo || cerrada);
  const resultados = useResultadosEncuesta(id, verResultados);

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
    voto.mutate(opciones, { onError: (e) => setError(mensajeDeErrorVoto(e)) });
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
        <Insignia texto={encuesta.categorias_aviso.nombre} />
        {encuesta.prioridad === 'alta' ? (
          <Insignia texto="Obligatoria" color={chipsIncidencia.pendiente} />
        ) : null}
      </View>
      <Text style={estilos.titulo}>{encuesta.titulo}</Text>
      {encuesta.descripcion ? <Text style={estilos.texto}>{encuesta.descripcion}</Text> : null}
      <Text style={estilos.detalle}>
        {cerrada ? 'Cerró el ' : 'Cierra el '}
        {fechaYHora(encuesta.cierra_en)} · un voto por unidad
      </Text>

      {yaVoto ? (
        <Text style={estilos.aviso}>Tu unidad ya votó en esta encuesta.</Text>
      ) : cerrada ? (
        <Text style={estilos.aviso}>La encuesta ya cerró. Tu unidad no votó.</Text>
      ) : null}

      {puedeVotar ? (
        <>
          {encuesta.encuesta_preguntas.map((pregunta) => (
            <View key={pregunta.id} style={estilos.tarjeta}>
              <Text style={estilos.pregunta}>{pregunta.texto}</Text>
              <Text style={estilos.detalle}>
                {pregunta.seleccion === 'unica' ? 'Elige una opción' : 'Puedes elegir varias'}
              </Text>
              {pregunta.encuesta_opciones.map((opcion) => {
                const marcada = (elegidas[pregunta.id] ?? []).includes(opcion.id);
                return (
                  <Pressable
                    key={opcion.id}
                    accessibilityRole={pregunta.seleccion === 'unica' ? 'radio' : 'checkbox'}
                    accessibilityState={{ checked: marcada }}
                    onPress={() => alternar(pregunta, opcion.id)}
                    style={[estilos.opcion, marcada && estilos.opcionMarcada]}
                  >
                    <Text style={[estilos.textoOpcion, marcada && estilos.textoOpcionMarcada]}>
                      {opcion.texto}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
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
          <Text style={estilos.subtitulo}>{cerrada ? 'Resultados' : 'Resultados en vivo'}</Text>
          {resultados.isPending ? (
            <ActivityIndicator color={colores.principal} />
          ) : resultados.isError ? (
            <Text style={estilos.error}>No pudimos cargar los resultados.</Text>
          ) : (
            <ResultadosEncuesta preguntas={encuesta.encuesta_preguntas} conteos={resultados.data} />
          )}
        </View>
      ) : (
        <Text style={estilos.detalle}>Los resultados se publican cuando cierre la encuesta.</Text>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  indicador: { marginTop: 48 },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  titulo: { ...tipografia.titulo, color: colores.texto },
  subtitulo: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  aviso: {
    ...tipografia.subtitulo,
    padding: 12,
    color: colores.principal,
    backgroundColor: colores.suave,
    borderRadius: radios.campo,
    overflow: 'hidden',
  },
  seccion: { gap: espacios.entreTarjetas },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 8,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  pregunta: { ...tipografia.subtitulo, color: colores.texto },
  // Cada opción mide al menos 52 px de alto para que sea fácil de tocar (RNF8).
  opcion: {
    minHeight: tamanos.alturaBotonMin,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    borderRadius: radios.campo,
  },
  opcionMarcada: { borderColor: colores.principal, backgroundColor: colores.suave },
  textoOpcion: { ...tipografia.cuerpo, color: colores.texto },
  textoOpcionMarcada: { ...tipografia.subtitulo, fontSize: 14, color: colores.principal },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

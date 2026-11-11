/**
 * Ruta `/directiva/encuestas/nueva` (rol Directiva): pantalla P14 · Crear encuesta del mockup.
 *
 * Qué hace: formulario para publicar una encuesta con preguntas de opción única o múltiple (RF8), dirigida
 * a todo el condominio o a ciertos sectores (RF13) y con la opción de marcarla obligatoria (RF14).
 * Incluye la categoría, las fechas de apertura y cierre y el interruptor de resultados en vivo, que el
 * mockup no traía (DISENO.md, corrección 5 de P14; RF12).
 * Cómo funciona: el borrador vive en el estado de la pantalla. Al publicar se valida con
 * `validarBorrador` (errores en español junto a cada campo) y se envía con `useCrearEncuesta`, que llama
 * a la función SQL `crear_encuesta`: se guarda todo o nada. Si sale bien, muestra la franja "Encuesta
 * publicada" (`useMensaje`) y vuelve a la lista: el formulario se descarta.
 * Se usa con: `directiva/_layout.tsx` (pantalla apilada), `directiva/(tabs)/encuestas.tsx` (enlace
 * "Crear encuesta") y los componentes `CampoTexto`, `ChipsSeleccion`, `CampoFecha`, `Interruptor`,
 * `Boton` y `TarjetaPregunta`.
 * Depende de: `src/hooks/useCatalogos.ts`, `src/hooks/useCrearEncuesta.ts`,
 * `src/utilidades/borradorEncuesta.ts` y `src/repositorios/encuestas.ts` (`mensajeDeErrorEncuesta`).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TarjetaPregunta } from '@/componentes/encuestas/TarjetaPregunta';
import { Boton } from '@/componentes/formulario/Boton';
import { CampoFecha } from '@/componentes/formulario/CampoFecha';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { Interruptor } from '@/componentes/formulario/Interruptor';
import { useMensaje } from '@/contexto/MensajeContext';
import { useCategorias, useSectores } from '@/hooks/useCatalogos';
import { useCrearEncuesta } from '@/hooks/useCrearEncuesta';
import { mensajeDeErrorEncuesta } from '@/repositorios/encuestas';
import { colores, espacios, tamanos, tipografia } from '@/tema';
import type { BorradorEncuesta, BorradorPregunta } from '@/tipos/encuesta';
import { nuevaPregunta, nuevoBorrador, validarBorrador } from '@/utilidades/borradorEncuesta';
import { volverA } from '@/utilidades/navegacion';

/** P14 · Crear encuesta (RF8, RF13, RF14). */
export default function NuevaEncuesta() {
  const router = useRouter();
  const categorias = useCategorias();
  const sectores = useSectores();
  const crear = useCrearEncuesta();
  const { mostrarMensaje } = useMensaje();

  // El borrador se crea una sola vez: la función inicial de useState no se vuelve a ejecutar.
  const [borrador, setBorrador] = useState<BorradorEncuesta>(() => nuevoBorrador());
  // Los errores de validación solo se muestran después del primer intento de publicar.
  const [intentado, setIntentado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const { errores, valido } = validarBorrador(borrador);
  const mostrar = intentado ? errores : { preguntas: {} };

  /** Cambia solo algunos campos del borrador, conservando el resto. */
  function cambiar(cambios: Partial<BorradorEncuesta>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
  }

  /** Reemplaza una pregunta del borrador por su versión editada. */
  function cambiarPregunta(pregunta: BorradorPregunta) {
    cambiar({
      preguntas: borrador.preguntas.map((p) => (p.clave === pregunta.clave ? pregunta : p)),
    });
  }

  /** Valida y publica. Si la base la rechaza, el mensaje en español queda visible sobre el botón. */
  function publicar() {
    setIntentado(true);
    setErrorEnvio(null);
    if (!valido) return;
    crear.mutate(borrador, {
      onSuccess: () => {
        // La franja confirma y la pantalla vuelve a la lista: el formulario se descarta, así no se
        // puede publicar dos veces la misma encuesta. (`Alert.alert` no dibuja nada en web.)
        mostrarMensaje('✅ Encuesta publicada. Los residentes ya pueden verla.');
        volverA(router, '/directiva/encuestas');
      },
      onError: (error) => setErrorEnvio(mensajeDeErrorEncuesta(error)),
    });
  }

  // Los catálogos (categorías y sectores) deben cargar antes de mostrar el formulario.
  if (categorias.isPending || sectores.isPending) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.principal} />
      </View>
    );
  }
  if (categorias.isError || sectores.isError) {
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.detalle}>No pudimos cargar las categorías y los sectores.</Text>
        <Boton
          variante="secundario"
          texto="Reintentar"
          alPresionar={() => {
            categorias.refetch();
            sectores.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.pantalla}
    >
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <CampoTexto
          etiqueta="Título"
          placeholder="Por ejemplo: Horario de la piscina"
          value={borrador.titulo}
          onChangeText={(titulo) => cambiar({ titulo })}
        />
        {mostrar.titulo ? <Text style={estilos.error}>{mostrar.titulo}</Text> : null}

        <CampoTexto
          etiqueta="Descripción (opcional)"
          placeholder="Explica de qué trata la encuesta"
          multiline
          value={borrador.descripcion}
          onChangeText={(descripcion) => cambiar({ descripcion })}
        />

        <ChipsSeleccion
          etiqueta="Categoría"
          opciones={categorias.data.map((c) => ({ id: c.id, texto: c.nombre }))}
          seleccionados={borrador.categoriaId ? [borrador.categoriaId] : []}
          alCambiar={([id]) => cambiar({ categoriaId: id ?? null })}
          error={mostrar.categoria}
        />

        {borrador.preguntas.map((pregunta, indice) => (
          <TarjetaPregunta
            key={pregunta.clave}
            numero={indice + 1}
            pregunta={pregunta}
            alCambiar={cambiarPregunta}
            alQuitar={
              borrador.preguntas.length > 1
                ? () =>
                    cambiar({
                      preguntas: borrador.preguntas.filter((p) => p.clave !== pregunta.clave),
                    })
                : null
            }
            errores={mostrar.preguntas[pregunta.clave]}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiar({ preguntas: [...borrador.preguntas, nuevaPregunta()] })}
          style={estilos.agregar}
        >
          <Text style={estilos.textoAgregar}>+ Agregar pregunta</Text>
        </Pressable>

        <ChipsSeleccion
          etiqueta="Dirigida a"
          opciones={sectores.data.map((s) => ({ id: s.id, texto: s.nombre }))}
          seleccionados={borrador.sectorIds}
          alCambiar={(sectorIds) => cambiar({ sectorIds })}
          multiple
          textoVacio="Todo el condominio"
        />

        <CampoFecha
          etiqueta="Abre"
          valor={borrador.abreEn}
          alCambiar={(abreEn) => cambiar({ abreEn })}
        />
        <CampoFecha
          etiqueta="Cierra"
          valor={borrador.cierraEn}
          alCambiar={(cierraEn) => cambiar({ cierraEn })}
          error={mostrar.fechas}
        />

        <Interruptor
          etiqueta="Resultados en vivo"
          ayuda="Si lo apagas, los residentes ven los resultados al cerrar la encuesta."
          valor={borrador.resultadosEnVivo}
          alCambiar={(resultadosEnVivo) => cambiar({ resultadosEnVivo })}
        />
        <Interruptor
          etiqueta="Encuesta obligatoria"
          ayuda="Los residentes la verán marcada como obligatoria."
          valor={borrador.obligatoria}
          alCambiar={(obligatoria) => cambiar({ obligatoria })}
        />

        {errorEnvio ? <Text style={estilos.error}>{errorEnvio}</Text> : null}
        {/* Tras publicar, el botón sigue bloqueado mientras la pantalla se cierra. */}
        <Boton
          icono="send"
          texto="Publicar encuesta"
          alPresionar={publicar}
          cargando={crear.isPending || crear.isSuccess}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16, paddingBottom: 48 },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    padding: espacios.margenLateral,
    gap: espacios.entreTarjetas,
    backgroundColor: colores.fondo,
  },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  agregar: { minHeight: tamanos.areaTactilMinima, justifyContent: 'center' },
  textoAgregar: { ...tipografia.subtitulo, color: colores.principal },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

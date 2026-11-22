/**
 * Ruta `/residente/avisos` (rol Residente): pantalla P4 · Avisos del mockup.
 *
 * Qué hace: lista los avisos que el residente puede ver (RF11) y permite filtrarlos por categoría
 * (RF10) con una fila de chips: "Todas" o una categoría; al elegir una, la lista muestra solo los
 * avisos de esa categoría (criterio de aceptación del issue #20). Encima van las encuestas abiertas:
 * las de prioridad alta llevan la insignia "Obligatoria" y salen primero (RF14, issue #24); al
 * tocar una se abre su pantalla de voto. Quién ve qué lo decide RLS en la base: solo avisos y
 * encuestas ya vigentes, del sector del residente o marcados para todos.
 * Cómo funciona: `useCategorias` llena los chips y `useAvisos(categoriaId)` trae la lista; el filtro
 * corre en la base y cada categoría guarda su propia caché. Estados: cargando (spinner), error
 * (mensaje y "Reintentar") y vacío (distinto si hay filtro o no).
 * Las pestañas no tienen encabezado (`headerShown: false`), así que la pantalla deja libre el alto de
 * la barra de estado del teléfono con `useSafeAreaInsets`; sin eso, el título queda debajo de la hora.
 * Se usa con: la barra inferior de `(tabs)/_layout.tsx`, `ChipsSeleccion` y el tema (`src/tema`).
 * Depende de: `src/hooks/useAvisos.ts`, `src/hooks/useCatalogos.ts` y `src/tipos/aviso.ts`.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { Insignia } from '@/componentes/Insignia';
import { useAvisos } from '@/hooks/useAvisos';
import { useCategorias } from '@/hooks/useCatalogos';
import { useEncuestasAbiertas } from '@/hooks/useEncuestasAbiertas';
import { chipsEncuesta, colores, espacios, radios, tipografia } from '@/tema';
import type { AvisoListado } from '@/tipos/aviso';
import type { EncuestaListada } from '@/tipos/encuesta';

/** Fecha corta en español para la tarjeta, por ejemplo "10 nov". */
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

/** Tarjeta de un aviso: categoría, fecha, título y mensaje. */
function TarjetaAviso({ aviso }: { aviso: AvisoListado }) {
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.filaSuperior}>
        {aviso.categoria ? (
          <View style={estilos.insignia}>
            <Text style={estilos.textoInsignia}>{aviso.categoria.nombre}</Text>
          </View>
        ) : null}
        <Text style={estilos.fecha}>{fechaCorta(aviso.vigente_desde)}</Text>
      </View>
      <Text style={estilos.titulo}>{aviso.titulo}</Text>
      <Text style={estilos.descripcion}>{aviso.descripcion}</Text>
    </View>
  );
}

/**
 * Tarjeta de una encuesta abierta: insignia "Obligatoria" si es de prioridad alta (RF14), título y
 * fecha de cierre. Es un botón: al tocarla abre la encuesta para votar.
 */
function TarjetaEncuesta({
  encuesta,
  alPresionar,
}: {
  encuesta: EncuestaListada;
  alPresionar: () => void;
}) {
  const obligatoria = encuesta.prioridad === 'alta';
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${obligatoria ? 'Encuesta obligatoria' : 'Encuesta'}: ${encuesta.titulo}`}
        onPress={alPresionar}
        style={[estilos.tarjeta, obligatoria && estilos.tarjetaObligatoria]}
      >
        <View style={estilos.filaSuperior}>
          {obligatoria ? (
            <Insignia texto="Obligatoria" colores={chipsEncuesta.obligatoria} />
          ) : (
            <Text style={estilos.fecha}>Encuesta</Text>
          )}
          <Text style={estilos.fecha}>Cierra el {fechaCorta(encuesta.cierra_en)}</Text>
        </View>
        <Text style={estilos.titulo}>{encuesta.titulo}</Text>
      </Pressable>
      <Boton
        texto="Ver resultados"
        variante="secundario"
        alPresionar={() =>
          router.push({ pathname: '/residente/resultados/[id]', params: { id: encuesta.id } })
        }
      />
    </View>
  );
}

/** P4 · Avisos del residente con filtro por categoría (RF10, RF11) y encuestas abiertas (RF14). */
export default function Avisos() {
  // null = "Todas"; un id = solo esa categoría (RF10).
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const router = useRouter();
  // Alto de la barra de estado (hora, batería) para que el título no quede debajo de ella.
  const { top } = useSafeAreaInsets();
  const categorias = useCategorias();
  const avisos = useAvisos(categoriaId);
  const encuestas = useEncuestasAbiertas(categoriaId);

  const cargando = categorias.isPending || avisos.isPending || encuestas.isPending;
  const conError = categorias.isError || avisos.isError || encuestas.isError;

  return (
    <View style={[estilos.pantalla, { paddingTop: top + espacios.margenLateral }]}>
      <Text style={estilos.encabezado}>Avisos</Text>
      <Boton
        texto="Resultados de encuestas"
        variante="secundario"
        alPresionar={() => router.push('/residente/resultados')}
      />

      {categorias.data ? (
        <ChipsSeleccion
          etiqueta="Categoría"
          opciones={categorias.data.map((c) => ({ id: c.id, texto: c.nombre }))}
          seleccionados={categoriaId ? [categoriaId] : []}
          alCambiar={([id]) => setCategoriaId(id ?? null)}
          textoVacio="Todas"
        />
      ) : null}

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator color={colores.principal} />
        </View>
      ) : conError ? (
        <View style={estilos.centrado}>
          <Text style={estilos.detalle}>No pudimos cargar los avisos.</Text>
          <Boton
            variante="secundario"
            texto="Reintentar"
            alPresionar={() => {
              categorias.refetch();
              avisos.refetch();
              encuestas.refetch();
            }}
          />
        </View>
      ) : (
        <FlatList
          data={avisos.data}
          keyExtractor={(aviso) => aviso.id}
          renderItem={({ item }) => <TarjetaAviso aviso={item} />}
          contentContainerStyle={estilos.lista}
          ListHeaderComponent={
            // Las encuestas abiertas van arriba de los avisos; si no hay, la sección no aparece.
            encuestas.data && encuestas.data.length > 0 ? (
              <View style={estilos.seccion}>
                <Text style={estilos.subencabezado}>Encuestas abiertas</Text>
                {encuestas.data.map((encuesta) => (
                  <TarjetaEncuesta
                    key={encuesta.id}
                    encuesta={encuesta}
                    alPresionar={() =>
                      router.push({
                        pathname: '/residente/encuesta/[id]',
                        params: { id: encuesta.id },
                      })
                    }
                  />
                ))}
                <Text style={estilos.subencabezado}>Avisos</Text>
              </View>
            ) : undefined
          }
          refreshControl={
            // Jalar hacia abajo vuelve a consultar (patrón estándar de listas en móvil).
            <RefreshControl
              refreshing={avisos.isRefetching}
              onRefresh={() => {
                avisos.refetch();
                encuestas.refetch();
              }}
              colors={[colores.principal]}
              tintColor={colores.principal}
            />
          }
          ListEmptyComponent={
            <View style={estilos.centrado}>
              <Text style={estilos.detalle}>
                {categoriaId
                  ? 'No hay avisos en esta categoría.'
                  : 'Todavía no hay avisos para ti.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacios.margenLateral,
    gap: 12,
  },
  encabezado: { ...tipografia.titulo, color: colores.texto },
  seccion: { gap: espacios.entreTarjetas },
  subencabezado: { ...tipografia.subtitulo, color: colores.texto },
  // La obligatoria se destaca con el borde ámbar del acento, además de la insignia.
  tarjetaObligatoria: { borderColor: colores.acento },
  lista: { gap: espacios.entreTarjetas, paddingBottom: 48, flexGrow: 1 },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 16,
    gap: 6,
  },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insignia: {
    backgroundColor: colores.suave,
    borderRadius: radios.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  textoInsignia: { ...tipografia.cuerpo, fontSize: 12, color: colores.principal },
  fecha: { ...tipografia.cuerpo, fontSize: 12, color: colores.textoSecundario },
  titulo: { ...tipografia.subtitulo, color: colores.texto },
  descripcion: { ...tipografia.cuerpo, color: colores.textoSecundario },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario, textAlign: 'center' },
});

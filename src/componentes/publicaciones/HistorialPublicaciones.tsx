/**
 * RF11: lista compartida por residente y directiva para consultar publicaciones anteriores/vigentes.
 * Usa useHistorial y useCategorias; RLS limita los sectores. La paginación evita descargar todo.
 * Conserva el tema y los accesos existentes de creación, voto y resultados.
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonCerrarSesion } from '@/componentes/BotonCerrarSesion';
import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useSesion } from '@/contexto/SesionContext';
import { useCategorias } from '@/hooks/useCatalogos';
import { useHistorial } from '@/hooks/useHistorial';
import { colores, espacios, radios, tipografia } from '@/tema';
import type { PeriodoHistorial, PublicacionHistorial, TipoPublicacion } from '@/tipos/historial';

/**
 * Los layouts de directiva fijan el tipo; el historial del residente permite alternarlos.
 * `conCerrarSesion` muestra el enlace "Cerrar sesión" junto al título: lo usan las pestañas de la directiva,
 * que no tienen otro modo de salir de la cuenta.
 */
type Props = {
  titulo: string;
  tipoFijo?: TipoPublicacion;
  crearHref?: Href;
  conCerrarSesion?: boolean;
};

/** Formato explícito de las fechas de publicación en la zona horaria del condominio. */
function fecha(valor: string): string {
  return new Date(valor).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Presenta filtros, páginas y recuperación de errores sin descartar resultados parciales. */
export function HistorialPublicaciones({ titulo, tipoFijo, crearHref, conCerrarSesion }: Props) {
  const router = useRouter();
  const { perfil } = useSesion();
  const usuarioId = perfil?.id;
  const directiva = perfil?.rol === 'directiva';
  const insets = useSafeAreaInsets();
  const [tipoElegido, setTipo] = useState<TipoPublicacion>('avisos');
  const tipo = tipoFijo ?? tipoElegido;
  const [periodo, setPeriodo] = useState<PeriodoHistorial>('todos');
  const [categoriaId, setCategoria] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const categorias = useCategorias();
  const consulta = useHistorial(tipo, periodo, categoriaId);
  const { refetch } = consulta;
  // Al recibir nuevas publicaciones entre páginas, una fila no aparece dos veces en la lista.
  const filas = [...new Map(consulta.data?.pages.flat().map((f) => [f.id, f]) ?? []).values()];
  useFocusEffect(
    useCallback(() => {
      setAhora(Date.now());
      if (usuarioId) void refetch();
    }, [usuarioId, refetch]),
  );

  /** Mantiene los filtros y vuelve a consultar tanto el catálogo como las páginas cargadas. */
  function actualizar() {
    setAhora(Date.now());
    void categorias.refetch();
    void refetch();
  }

  /** Tarjeta legible con vigencia; el destino de una encuesta depende del rol real de la sesión. */
  function tarjeta({ item }: { item: PublicacionHistorial }) {
    const estado =
      Date.parse(item.fin) <= ahora
        ? 'Finalizada'
        : Date.parse(item.inicio) > ahora
          ? 'Programada'
          : 'Vigente';
    return (
      <View style={estilos.tarjeta}>
        <Text style={estilos.estado}>
          {estado} · {item.categoria?.nombre ?? 'Sin categoría'}
        </Text>
        <Text accessibilityRole="header" style={estilos.subtitulo}>
          {item.titulo}
        </Text>
        {item.descripcion ? (
          <Text selectable style={estilos.texto}>
            {item.descripcion}
          </Text>
        ) : null}
        <Text style={estilos.texto}>
          Desde {fecha(item.inicio)}
          {'\n'}Hasta {fecha(item.fin)}
        </Text>
        {tipo === 'encuestas' ? (
          <Boton
            variante="secundario"
            texto={
              directiva
                ? 'Ver resultados'
                : estado === 'Vigente'
                  ? 'Responder encuesta'
                  : 'Ver encuesta'
            }
            alPresionar={() =>
              router.push(
                directiva
                  ? { pathname: '/directiva/encuestas/[id]/resultados', params: { id: item.id } }
                  : { pathname: '/residente/encuesta/[id]', params: { id: item.id } },
              )
            }
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: tipoFijo ? insets.top + 20 : 20 }]}>
      <View style={estilos.encabezado}>
        <Text accessibilityRole="header" style={[estilos.titulo, estilos.tituloEncabezado]}>
          {titulo}
        </Text>
        {conCerrarSesion ? <BotonCerrarSesion /> : null}
      </View>
      {crearHref ? (
        <Boton
          texto={tipo === 'avisos' ? 'Crear aviso' : 'Crear encuesta'}
          alPresionar={() => router.push(crearHref)}
        />
      ) : null}
      {!tipoFijo ? (
        <ChipsSeleccion
          etiqueta="Publicaciones"
          opciones={[
            { id: 'avisos', texto: 'Avisos' },
            { id: 'encuestas', texto: 'Encuestas' },
          ]}
          seleccionados={[tipo]}
          alCambiar={([id]) => {
            if (id === 'avisos' || id === 'encuestas') setTipo(id);
          }}
        />
      ) : null}
      <ChipsSeleccion
        etiqueta="Vigencia"
        opciones={[
          { id: 'todos', texto: 'Todas' },
          { id: 'vigentes', texto: 'Vigentes' },
          { id: 'anteriores', texto: 'Anteriores' },
        ]}
        seleccionados={[periodo]}
        alCambiar={([id]) => {
          if (id === 'todos' || id === 'vigentes' || id === 'anteriores') setPeriodo(id);
        }}
      />
      {categorias.data ? (
        <ChipsSeleccion
          etiqueta="Categoría"
          opciones={categorias.data.map((c) => ({ id: c.id, texto: c.nombre }))}
          seleccionados={categoriaId ? [categoriaId] : []}
          textoVacio="Todas"
          alCambiar={([id]) => setCategoria(id ?? null)}
        />
      ) : null}
      {consulta.isError || categorias.isError ? (
        <View style={estilos.error}>
          <Text accessibilityRole="alert" style={estilos.texto}>
            No pudimos actualizar el historial completo. Revisa tu conexión.
          </Text>
          <Boton
            texto="Reintentar"
            variante="secundario"
            alPresionar={actualizar}
            cargando={consulta.isFetching || categorias.isFetching}
          />
        </View>
      ) : null}
      {consulta.isPending ? (
        <ActivityIndicator accessibilityLabel="Cargando historial" color={colores.principal} />
      ) : null}
      <FlatList
        data={filas}
        keyExtractor={(item) => item.id}
        renderItem={tarjeta}
        contentContainerStyle={[estilos.lista, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={consulta.isRefetching}
            onRefresh={actualizar}
            colors={[colores.principal]}
          />
        }
        ListEmptyComponent={
          !consulta.isPending && !consulta.isError ? (
            <Text style={estilos.texto}>No hay publicaciones con estos filtros.</Text>
          ) : undefined
        }
        ListFooterComponent={
          consulta.hasNextPage ? (
            <Boton
              texto="Cargar más"
              variante="secundario"
              cargando={consulta.isFetchingNextPage}
              deshabilitado={consulta.isFetching}
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
  pantalla: {
    flex: 1,
    paddingHorizontal: espacios.margenLateral,
    gap: 12,
    backgroundColor: colores.fondo,
  },
  titulo: { ...tipografia.titulo, color: colores.texto },
  // Fila del título con, a la derecha, el enlace "Cerrar sesión" cuando la pantalla lo pide.
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tituloEncabezado: { flexShrink: 1 },
  subtitulo: { ...tipografia.subtitulo, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.textoSecundario },
  estado: { ...tipografia.cuerpo, color: colores.principal },
  lista: { gap: 16, flexGrow: 1 },
  tarjeta: {
    padding: 16,
    gap: 10,
    backgroundColor: colores.superficie,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  error: { gap: 8 },
});

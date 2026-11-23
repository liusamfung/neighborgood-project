/**
 * HistorialAlertas: registro histórico de alertas de pánico para la directiva y el guardia (RF28).
 *
 * Qué hace: muestra cada alerta con su fecha y hora (Lima), tipo, unidad de origen y estado de resolución
 * ("Atendida a las 7:05 p. m. · 23 min", "Personal en camino" o "Sin respuesta"). Arriba tiene filtros por
 * tipo y por estado; abajo, "Cargar más" de 20 en 20. Al tocar una alerta abre su detalle (RF27).
 * Cómo funciona: los filtros viven en el estado del componente y la lista sale de `useHistorialAlertas`
 * (RLS deja al personal ver todas las alertas). Tiene estados para cargando, error con "Reintentar", lista
 * vacía y lista vacía por filtros, y se refresca deslizando hacia abajo.
 * Se usa con: `src/app/guardia/historial-alertas.tsx` y `src/app/directiva/historial-alertas.tsx`.
 * Depende de: `src/hooks/useHistorialAlertas.ts`, `ChipsSeleccion`, `Insignia`, `Boton`, `useSesion`,
 * `src/utilidades/alertaEmergencia.ts` (título del tipo) y el tema.
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

import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { Insignia } from '@/componentes/Insignia';
import { useSesion } from '@/contexto/SesionContext';
import { useHistorialAlertas } from '@/hooks/useHistorialAlertas';
import {
  chipsAlerta,
  coloresAlerta,
  colores,
  espacios,
  etiquetasAlerta,
  radios,
  tipografia,
} from '@/tema';
import type { EstadoAlerta, TipoAlerta } from '@/tipos/alerta';
import type { AlertaHistorial, FiltrosHistorialAlertas } from '@/tipos/historialAlertas';
import { TIPOS_ALERTA, tituloDeTipo } from '@/utilidades/alertaEmergencia';

/** Opciones del filtro de estado, en el orden en que avanza una alerta. */
const OPCIONES_ESTADO: { id: EstadoAlerta; texto: string }[] = [
  { id: 'activa', texto: etiquetasAlerta.activa },
  { id: 'en_camino', texto: etiquetasAlerta.en_camino },
  { id: 'atendida', texto: etiquetasAlerta.atendida },
];

/** Opciones del filtro de tipo: las mismas tres del botón de pánico (RF23). */
const OPCIONES_TIPO = TIPOS_ALERTA.map((opcion) => ({ id: opcion.tipo, texto: opcion.titulo }));

/** Fecha y hora de un instante en Lima, por ejemplo "23/11/2026, 6:42 p. m.". */
function fechaHoraLima(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Solo la hora de un instante en Lima, por ejemplo "7:05 p. m.". */
function horaLima(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Texto del estado de resolución de una alerta, a partir de las respuestas del personal.
 *
 * @param alerta la alerta con sus atenciones.
 * @returns por ejemplo "Atendida a las 7:05 p. m. · 23 min después", "Personal en camino desde 6:50 p. m."
 * o "Sin respuesta del personal".
 */
function textoResolucion(alerta: AlertaHistorial): string {
  // La respuesta más reciente de cada estado (la bitácora puede tener varias de "en camino").
  const ultima = (estado: EstadoAlerta) =>
    alerta.atenciones
      .filter((a) => a.estado === estado)
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
  if (alerta.estado === 'atendida') {
    const atendida = ultima('atendida');
    if (!atendida) return 'Atendida';
    const minutos = Math.max(
      0,
      Math.round((Date.parse(atendida.creado_en) - Date.parse(alerta.creada_en)) / 60_000),
    );
    return `Atendida a las ${horaLima(atendida.creado_en)} · ${minutos} min después`;
  }
  if (alerta.estado === 'en_camino') {
    const enCamino = ultima('en_camino');
    return enCamino
      ? `Personal en camino desde ${horaLima(enCamino.creado_en)}`
      : 'Personal en camino';
  }
  return 'Sin respuesta del personal';
}

/** Historial de alertas con filtros por tipo y estado, para la directiva y el guardia. */
export function HistorialAlertas() {
  const [filtros, setFiltros] = useState<FiltrosHistorialAlertas>({ tipo: null, estado: null });
  const consulta = useHistorialAlertas(filtros);
  const { perfil } = useSesion();
  const router = useRouter();
  // Sin repetidos: si entra una alerta nueva entre página y página, la última de una página se corre a
  // la siguiente.
  const alertas = [...new Map((consulta.data?.pages.flat() ?? []).map((a) => [a.id, a])).values()];
  const hayFiltros = filtros.tipo !== null || filtros.estado !== null;

  /** Abre el detalle de la alerta en la pila del rol (RF27). */
  function abrir(id: string) {
    router.push({
      pathname: perfil?.rol === 'guardia' ? '/guardia/alerta/[id]' : '/directiva/alerta/[id]',
      params: { id },
    });
  }

  const cabecera = (
    <View style={estilos.cabecera}>
      <ChipsSeleccion
        etiqueta="Tipo"
        textoVacio="Todos"
        opciones={OPCIONES_TIPO}
        seleccionados={filtros.tipo ? [filtros.tipo] : []}
        alCambiar={(ids) => setFiltros((f) => ({ ...f, tipo: (ids[0] as TipoAlerta) ?? null }))}
      />
      <ChipsSeleccion
        etiqueta="Estado"
        textoVacio="Todos"
        opciones={OPCIONES_ESTADO}
        seleccionados={filtros.estado ? [filtros.estado] : []}
        alCambiar={(ids) => setFiltros((f) => ({ ...f, estado: (ids[0] as EstadoAlerta) ?? null }))}
      />
    </View>
  );

  /** Lo que se ve cuando no hay filas: cargando, error, sin alertas o sin alertas con esos filtros. */
  function vacio() {
    if (consulta.isPending) return <ActivityIndicator color={colores.principal} />;
    if (consulta.isError) {
      return (
        <View style={estilos.aviso}>
          <Text style={estilos.texto} accessibilityRole="alert">
            No pudimos cargar el historial de alertas.
          </Text>
          <Boton texto="Reintentar" alPresionar={() => void consulta.refetch()} />
        </View>
      );
    }
    return (
      <Text style={estilos.texto}>
        {hayFiltros ? 'No hay alertas con estos filtros.' : 'Todavía no hay alertas registradas.'}
      </Text>
    );
  }

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={alertas}
      keyExtractor={(alerta) => alerta.id}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={vacio()}
      refreshControl={
        <RefreshControl
          refreshing={consulta.isRefetching && !consulta.isFetchingNextPage}
          onRefresh={() => void consulta.refetch()}
          colors={[colores.principal]}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Alerta ${tituloDeTipo(item.tipo)}, ${etiquetasAlerta[item.estado]}. Ver detalle.`}
          onPress={() => abrir(item.id)}
          style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
        >
          <View style={estilos.fila}>
            <View style={[estilos.punto, { backgroundColor: coloresAlerta[item.tipo] }]} />
            <Text style={[tipografia.subtitulo, estilos.titulo]}>{tituloDeTipo(item.tipo)}</Text>
            <Insignia texto={etiquetasAlerta[item.estado]} colores={chipsAlerta[item.estado]} />
          </View>
          <Text style={estilos.texto}>
            {item.sector?.nombre ? `${item.sector.nombre} · ` : ''}Unidad{' '}
            {item.unidad?.codigo ?? '—'}
          </Text>
          <Text style={estilos.secundario}>{fechaHoraLima(item.creada_en)}</Text>
          <Text style={estilos.secundario}>{textoResolucion(item)}</Text>
        </Pressable>
      )}
      ListFooterComponent={
        consulta.hasNextPage ? (
          <Boton
            texto="Cargar más"
            variante="secundario"
            cargando={consulta.isFetchingNextPage}
            alPresionar={() => void consulta.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: espacios.entreTarjetas },
  cabecera: { gap: 12, marginBottom: 4 },
  aviso: { gap: 12 },
  tarjeta: {
    gap: 4,
    padding: 16,
    backgroundColor: colores.superficie,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  presionada: { opacity: 0.7 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  titulo: { flex: 1, color: colores.texto },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  secundario: { ...tipografia.cuerpo, color: colores.textoSecundario },
});

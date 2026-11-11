/**
 * Ruta `/residente/avisos` (rol Residente): pantalla P4 · Avisos del mockup.
 *
 * Qué hace: lista los avisos que el residente puede ver (RF11) y permite filtrarlos por categoría
 * (RF10) con una fila de chips: "Todas" o una categoría; al elegir una, la lista muestra solo los
 * avisos de esa categoría (criterio de aceptación del issue #20). Quién ve qué lo decide RLS en la
 * base: solo avisos vigentes, del sector del residente o marcados para todos.
 * Cómo funciona: `useCategorias` llena los chips y `useAvisos(categoriaId)` trae la lista; el filtro
 * corre en la base y cada categoría guarda su propia caché. Estados: cargando (spinner), error
 * (mensaje y "Reintentar") y vacío (distinto si hay filtro o no).
 * Se usa con: la barra inferior de `(tabs)/_layout.tsx`, `ChipsSeleccion` y el tema (`src/tema`).
 * Depende de: `src/hooks/useAvisos.ts`, `src/hooks/useCatalogos.ts` y `src/tipos/aviso.ts`.
 */
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useAvisos } from '@/hooks/useAvisos';
import { useCategorias } from '@/hooks/useCatalogos';
import { colores, espacios, radios, tipografia } from '@/tema';
import type { AvisoListado } from '@/tipos/aviso';

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

/** P4 · Avisos del residente con filtro por categoría (RF10, RF11). */
export default function Avisos() {
  // null = "Todas"; un id = solo esa categoría (RF10).
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const categorias = useCategorias();
  const avisos = useAvisos(categoriaId);

  const cargando = categorias.isPending || avisos.isPending;
  const conError = categorias.isError || avisos.isError;

  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.encabezado}>Avisos</Text>

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
            }}
          />
        </View>
      ) : (
        <FlatList
          data={avisos.data}
          keyExtractor={(aviso) => aviso.id}
          renderItem={({ item }) => <TarjetaAviso aviso={item} />}
          contentContainerStyle={estilos.lista}
          refreshControl={
            // Jalar hacia abajo vuelve a consultar (patrón estándar de listas en móvil).
            <RefreshControl
              refreshing={avisos.isRefetching}
              onRefresh={() => {
                avisos.refetch();
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
    paddingTop: espacios.margenLateral,
    gap: 12,
  },
  encabezado: { ...tipografia.titulo, color: colores.texto },
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
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 32 },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario, textAlign: 'center' },
});

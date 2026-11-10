/**
 * Ruta `/directiva/avisos/nuevo` (rol Directiva): pantalla P13 · Crear aviso del mockup.
 *
 * Qué hace: formulario para publicar un aviso con título, mensaje, categoría (RF10), imagen opcional y
 * vigencia desde/hasta (RF7), dirigido a todo el condominio o a ciertos sectores (RF13). La imagen y las
 * fechas no estaban en el mockup (DISENO.md, corrección 4 de P13).
 * Cómo funciona: el borrador vive en el estado de la pantalla. Al publicar se valida con
 * `validarBorrador` (errores en español junto a cada campo) y se envía con `useCrearAviso`: sube la imagen
 * (si hay) y llama a la función SQL `crear_aviso`, que guarda el aviso y sus sectores o nada. Si sale bien,
 * avisa y vuelve a la lista. La pantalla no promete notificaciones: eso es otro issue.
 * Se usa con: `directiva/_layout.tsx` (pantalla apilada), `directiva/(tabs)/avisos.tsx` (enlace
 * "Crear aviso") y los componentes `CampoTexto`, `ChipsSeleccion`, `SelectorImagen`, `CampoFecha` y `Boton`.
 * Depende de: `src/hooks/useCatalogos.ts`, `src/hooks/useCrearAviso.ts`,
 * `src/utilidades/borradorAviso.ts` y `src/repositorios/avisos.ts` (`mensajeDeErrorAviso`).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { CampoFecha } from '@/componentes/formulario/CampoFecha';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { SelectorImagen } from '@/componentes/formulario/SelectorImagen';
import { useCategorias, useSectores } from '@/hooks/useCatalogos';
import { useCrearAviso } from '@/hooks/useCrearAviso';
import { mensajeDeErrorAviso } from '@/repositorios/avisos';
import { colores, espacios, tipografia } from '@/tema';
import type { BorradorAviso } from '@/tipos/aviso';
import { nuevoBorrador, validarBorrador } from '@/utilidades/borradorAviso';

/** P13 · Crear aviso (RF7, RF13). */
export default function NuevoAviso() {
  const router = useRouter();
  const categorias = useCategorias();
  const sectores = useSectores();
  const crear = useCrearAviso();

  // El borrador se crea una sola vez: la función inicial de useState no se vuelve a ejecutar.
  const [borrador, setBorrador] = useState<BorradorAviso>(() => nuevoBorrador());
  // Los errores de validación solo se muestran después del primer intento de publicar.
  const [intentado, setIntentado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const { errores, valido } = validarBorrador(borrador);
  const mostrar = intentado ? errores : {};

  /** Cambia solo algunos campos del borrador, conservando el resto. */
  function cambiar(cambios: Partial<BorradorAviso>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
  }

  /** Valida y publica. Si la base la rechaza, el mensaje en español queda visible sobre el botón. */
  function publicar() {
    setIntentado(true);
    setErrorEnvio(null);
    if (!valido) return;
    crear.mutate(borrador, {
      onSuccess: () => {
        Alert.alert('Aviso publicado', 'Los residentes destinatarios ya pueden verlo.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      },
      onError: (error) => setErrorEnvio(mensajeDeErrorAviso(error)),
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
          placeholder="Por ejemplo: Corte de agua"
          value={borrador.titulo}
          onChangeText={(titulo) => cambiar({ titulo })}
        />
        {mostrar.titulo ? <Text style={estilos.error}>{mostrar.titulo}</Text> : null}

        <CampoTexto
          etiqueta="Mensaje"
          placeholder="Escribe el aviso para los residentes"
          multiline
          value={borrador.descripcion}
          onChangeText={(descripcion) => cambiar({ descripcion })}
        />
        {mostrar.descripcion ? <Text style={estilos.error}>{mostrar.descripcion}</Text> : null}

        <ChipsSeleccion
          etiqueta="Categoría"
          opciones={categorias.data.map((c) => ({ id: c.id, texto: c.nombre }))}
          seleccionados={borrador.categoriaId ? [borrador.categoriaId] : []}
          alCambiar={([id]) => cambiar({ categoriaId: id ?? null })}
          error={mostrar.categoria}
        />

        <SelectorImagen
          etiqueta="Imagen (opcional)"
          valor={borrador.imagen}
          alCambiar={(imagen) => cambiar({ imagen })}
        />

        <ChipsSeleccion
          etiqueta="Dirigido a"
          opciones={sectores.data.map((s) => ({ id: s.id, texto: s.nombre }))}
          seleccionados={borrador.sectorIds}
          alCambiar={(sectorIds) => cambiar({ sectorIds })}
          multiple
          textoVacio="Todo el condominio"
        />

        <CampoFecha
          etiqueta="Vigente desde"
          valor={borrador.vigenteDesde}
          alCambiar={(vigenteDesde) => cambiar({ vigenteDesde })}
        />
        <CampoFecha
          etiqueta="Vigente hasta"
          valor={borrador.vigenteHasta}
          alCambiar={(vigenteHasta) => cambiar({ vigenteHasta })}
          error={mostrar.vigencia}
        />

        {errorEnvio ? <Text style={estilos.error}>{errorEnvio}</Text> : null}
        <Boton texto="Publicar aviso" alPresionar={publicar} cargando={crear.isPending} />
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
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

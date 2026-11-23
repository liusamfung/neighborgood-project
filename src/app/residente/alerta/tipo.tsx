/**
 * Ruta `/residente/alerta/tipo` (rol Residente): pantalla P3 · Elegir tipo de alerta y confirmar (RF23, Sprint 5).
 *
 * Qué hace: la persona elige qué está pasando (Médica, Incendio o Seguridad; Médica viene marcada, como en
 * el mockup) y confirma. Al confirmar crea la alerta en la base y pasa a "Alerta enviada" (P3b). Es el
 * segundo y tercer toque del flujo de RNF4: Inicio → elegir tipo → confirmar.
 * Cómo funciona: el botón de confirmar queda en "cargando" mientras se envía y ignora un segundo toque,
 * para no crear dos alertas. Si falla, muestra el error en español sobre el botón y conserva el tipo
 * elegido; no reintenta solo. Al terminar usa `router.replace`, así "atrás" no vuelve a confirmar.
 * La ubicación es la de la unidad del residente (regla 4 de CLAUDE.md: sin GPS ni mapas); el emisor y la
 * unidad los comprueba la política RLS de la base y el trigger fija el estado `activa` y la hora.
 * Se usa con: `residente/_layout.tsx` (pantalla apilada) y la tarjeta de pánico de `(tabs)/index.tsx`.
 * Depende de: `useEmitirAlerta` y `useUbicacion` (`src/hooks/useEmitirAlerta.ts`), `useSesion`,
 * `OpcionTipoAlerta`, `Boton` y las reglas de `src/utilidades/alertaEmergencia.ts`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OpcionTipoAlerta } from '@/componentes/alertas/OpcionTipoAlerta';
import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { useEmitirAlerta, useUbicacion } from '@/hooks/useEmitirAlerta';
import { colores, espacios, radios, tamanos, tipografia } from '@/tema';
import type { TipoAlerta } from '@/tipos/alerta';
import {
  mensajeErrorAlerta,
  TIPO_POR_DEFECTO,
  TIPOS_ALERTA,
  textoConfirmar,
  textoUbicacion,
} from '@/utilidades/alertaEmergencia';

/** P3 · Elegir el tipo de alerta y confirmar el envío. */
export default function ElegirTipoAlerta() {
  const router = useRouter();
  // Margen inferior del teléfono (barra de gestos) para que los botones no queden tapados.
  const { bottom } = useSafeAreaInsets();
  const { perfil } = useSesion();
  const ubicacion = useUbicacion(perfil?.unidad_id);
  const emitir = useEmitirAlerta();
  const [tipo, setTipo] = useState<TipoAlerta>(TIPO_POR_DEFECTO);
  const [error, setError] = useState<string | null>(null);

  const textoUnidad = textoUbicacion(ubicacion.data);
  // Un residente siempre tiene unidad (regla del modelo); si faltara, no hay desde dónde alertar.
  const sinUnidad = !perfil?.unidad_id;

  /** Crea la alerta. Con éxito pasa a P3b con los datos para mostrar; con error avisa y deja reintentar. */
  function confirmar() {
    // Un segundo toque mientras se envía no debe crear otra alerta.
    if (!perfil?.unidad_id || emitir.isPending) return;
    setError(null);
    emitir.mutate(
      { emisorId: perfil.id, unidadId: perfil.unidad_id, tipo },
      {
        onSuccess: (alerta) =>
          router.replace({
            pathname: '/residente/alerta/enviada',
            params: {
              tipo: alerta.tipo,
              ubicacion: textoUbicacion(alerta.unidad),
              hora: alerta.creada_en,
            },
          }),
        onError: (fallo) => setError(mensajeErrorAlerta(fallo)),
      },
    );
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[
        estilos.contenido,
        { paddingBottom: bottom + espacios.margenLateral },
      ]}
    >
      <Text style={estilos.pregunta}>¿Qué está pasando?</Text>
      <Text style={estilos.ayuda}>Elige el tipo de emergencia para avisar a la guardia.</Text>

      <View accessibilityRole="radiogroup" style={estilos.opciones}>
        {TIPOS_ALERTA.map((opcion) => (
          <OpcionTipoAlerta
            key={opcion.tipo}
            tipo={opcion.tipo}
            titulo={opcion.titulo}
            descripcion={opcion.descripcion}
            icono={opcion.icono}
            seleccionado={opcion.tipo === tipo}
            alPresionar={() => {
              setTipo(opcion.tipo);
              setError(null);
            }}
          />
        ))}
      </View>

      <View style={estilos.ubicacion}>
        <Ionicons name="home-outline" size={20} color={colores.texto} />
        <Text style={estilos.textoUbicacion}>
          Se enviará con la ubicación de tu departamento
          {textoUnidad ? ': ' : '.'}
          {textoUnidad ? <Text style={estilos.negrita}>{textoUnidad}</Text> : null}
        </Text>
      </View>

      {/* Empuja los botones al final de la pantalla; con letra grande la pantalla se desplaza. */}
      <View style={estilos.espacio} />

      {sinUnidad ? (
        <Text style={estilos.error}>Tu perfil no tiene unidad. Contacta a la directiva.</Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      ) : null}

      <Boton
        variante="emergencia"
        texto={textoConfirmar(tipo)}
        alPresionar={confirmar}
        cargando={emitir.isPending}
        deshabilitado={sinUnidad}
      />
      <Pressable
        accessibilityRole="button"
        disabled={emitir.isPending}
        onPress={() => router.back()}
        style={estilos.cancelar}
      >
        <Text style={estilos.textoCancelar}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

// Pantalla con desplazamiento; `flexGrow` deja el espacio libre para que los botones queden abajo.
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, paddingHorizontal: espacios.margenLateral, paddingTop: 8, gap: 12 },
  pregunta: { ...tipografia.titulo, color: colores.texto },
  ayuda: { ...tipografia.cuerpo, color: colores.textoSecundario },
  opciones: { gap: espacios.entreTarjetas, marginTop: 8 },
  ubicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colores.suave,
    borderRadius: radios.tarjeta,
  },
  textoUbicacion: { ...tipografia.cuerpo, flex: 1, color: colores.texto },
  negrita: { fontFamily: tipografia.subtitulo.fontFamily },
  espacio: { flexGrow: 1, minHeight: 16 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  cancelar: { minHeight: tamanos.areaTactilMinima, alignItems: 'center', justifyContent: 'center' },
  textoCancelar: { ...tipografia.subtitulo, color: colores.textoSecundario },
});

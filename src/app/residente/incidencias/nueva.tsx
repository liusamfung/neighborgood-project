/**
 * Ruta `/residente/incidencias/nueva` (rol Residente): pantalla P7 · Reportar incidencia del mockup (RF29).
 *
 * Qué hace: formulario para reportar una incidencia con ubicación, descripción y de 1 a 3 fotos. La ubicación
 * viene precargada con la unidad del residente y se puede editar (corrección 3 de DISENO.md). El mockup traía
 * un "Título", pero `incidencias` no tiene esa columna y manda el modelo de datos, así que no se pide. Al
 * enviar, la incidencia queda en estado "Pendiente"; la pantalla lo avisa antes con un cuadro informativo.
 * Cómo funciona: el borrador vive en el estado de la pantalla. Al enviar se valida con `validarBorrador`
 * (errores en español junto a cada campo; sin foto no deja enviar) y se envía con `useReportarIncidencia`:
 * sube las fotos y llama a la función SQL `crear_incidencia`. Si sale bien, avisa y vuelve atrás; si falla,
 * muestra el motivo sobre el botón y conserva el texto y las fotos para reintentar.
 * Se usa con: `residente/_layout.tsx` (pantalla apilada), el enlace "Reportar incidencia" de
 * `residente/(tabs)/incidencias.tsx` y los componentes `CampoTexto`, `SelectorFotos` y `Boton`.
 * Depende de: `src/contexto/SesionContext.tsx` (perfil y unidad), `src/hooks/useEmitirAlerta.ts` (`useUbicacion`),
 * `src/hooks/useReportarIncidencia.ts` y `src/utilidades/reporteIncidencia.ts`.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { SelectorFotos } from '@/componentes/reportes/SelectorFotos';
import { useSesion } from '@/contexto/SesionContext';
import { useUbicacion } from '@/hooks/useEmitirAlerta';
import { useReportarIncidencia } from '@/hooks/useReportarIncidencia';
import { colores, espacios, radios, tipografia } from '@/tema';
import { chipsIncidencia } from '@/tema/colores';
import type { BorradorReporte } from '@/tipos/reporteIncidencia';
import { textoUbicacion } from '@/utilidades/alertaEmergencia';
import {
  mensajeErrorReporte,
  nuevoBorrador,
  validarBorrador,
} from '@/utilidades/reporteIncidencia';

/** P7 · Reportar incidencia (RF29). */
export default function NuevaIncidencia() {
  const router = useRouter();
  const { perfil } = useSesion();
  const unidad = useUbicacion(perfil?.unidad_id);
  const reportar = useReportarIncidencia(perfil?.id ?? '');

  // Descripción y fotos viven en el estado; la ubicación solo si el residente la edita.
  const [parcial, setParcial] = useState<BorradorReporte>(() => nuevoBorrador(''));
  const [ubicacionEditada, setUbicacionEditada] = useState<string | null>(null);
  // Los errores de validación solo se muestran después del primer intento de enviar.
  const [intentado, setIntentado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const sinUnidad = !perfil?.unidad_id;
  // Mientras el residente no edita, se muestra la unidad en cuanto llega de la base ("Torre A · A-101").
  const borrador: BorradorReporte = {
    ...parcial,
    ubicacion: ubicacionEditada ?? textoUbicacion(unidad.data),
  };
  const { errores, valido } = validarBorrador(borrador);
  const mostrar = intentado ? errores : {};

  /** Valida y envía. Si falla, el motivo queda visible sobre el botón y el borrador se conserva. */
  function enviar() {
    setIntentado(true);
    setErrorEnvio(null);
    if (!valido || sinUnidad || reportar.isPending) return;
    reportar.mutate(borrador, {
      onSuccess: () => {
        Alert.alert('Incidencia enviada', 'Quedó en estado Pendiente. La directiva la revisará.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      },
      onError: (error) => setErrorEnvio(mensajeErrorReporte(error)),
    });
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
          etiqueta="Ubicación"
          placeholder="Por ejemplo: Pasillo del piso 3"
          value={borrador.ubicacion}
          onChangeText={setUbicacionEditada}
        />
        {mostrar.ubicacion ? <Text style={estilos.error}>{mostrar.ubicacion}</Text> : null}

        <CampoTexto
          etiqueta="Descripción"
          placeholder="Cuenta qué está pasando"
          multiline
          value={borrador.descripcion}
          onChangeText={(descripcion) => setParcial((actual) => ({ ...actual, descripcion }))}
        />
        {mostrar.descripcion ? <Text style={estilos.error}>{mostrar.descripcion}</Text> : null}

        <SelectorFotos
          valor={borrador.fotos}
          alCambiar={(fotos) => setParcial((actual) => ({ ...actual, fotos }))}
          error={mostrar.fotos}
        />

        <View style={estilos.estado}>
          <Text style={estilos.estadoTitulo}>Estado inicial: Pendiente</Text>
          <Text style={estilos.estadoTexto}>
            Así quedará tu incidencia al enviarla. Podrás seguir su avance.
          </Text>
        </View>

        {sinUnidad ? (
          <Text style={estilos.error}>Tu perfil no tiene unidad. Contacta a la directiva.</Text>
        ) : null}
        {errorEnvio ? <Text style={estilos.error}>{errorEnvio}</Text> : null}
        <Boton
          texto="Enviar incidencia"
          alPresionar={enviar}
          cargando={reportar.isPending}
          deshabilitado={sinUnidad}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16, paddingBottom: 48 },
  // Cuadro con los colores del chip "Pendiente" (ámbar) para que se reconozca el estado.
  estado: {
    gap: 4,
    padding: 14,
    borderRadius: radios.campo,
    backgroundColor: chipsIncidencia.pendiente.fondo,
  },
  estadoTitulo: { ...tipografia.subtitulo, color: chipsIncidencia.pendiente.texto },
  estadoTexto: { ...tipografia.cuerpo, color: chipsIncidencia.pendiente.texto },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

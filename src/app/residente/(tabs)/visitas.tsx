/**
 * Ruta `/residente/visitas` (rol Residente): pantalla P6 · Visitas y pase QR del mockup.
 *
 * Qué hace: el residente crea un pase indicando el nombre del invitado, el día y la hora estimada de
 * llegada (RF15; el mockup solo traía el nombre, DISENO.md corrección 2) y ve debajo la lista de sus
 * pases con su estado. El código QR (RF16), compartir (RF17) y anular (RF22) llegan en sus propios issues.
 * Cómo funciona: el borrador vive en el estado de la pantalla. Al generar, se valida con
 * `validarBorrador` (errores en español junto al campo) y se envía con `useCrearPase`, que llama a la Edge
 * Function `crear-pase`: ella guarda el pase `vigente` en la unidad del residente y la lista se actualiza.
 * Se usa con: la barra inferior definida en `(tabs)/_layout.tsx`, que la registra como pestaña, y los
 * componentes `CampoTexto`, `CampoFecha`, `Boton` y `TarjetaPase`.
 * Depende de: `src/hooks/useCrearPase.ts`, `src/hooks/useMisPases.ts` y `src/utilidades/borradorPase.ts`.
 */
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

import { TarjetaPase } from '@/componentes/visitas/TarjetaPase';
import { Boton } from '@/componentes/formulario/Boton';
import { CampoFecha } from '@/componentes/formulario/CampoFecha';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { useCrearPase } from '@/hooks/useCrearPase';
import { useMisPases } from '@/hooks/useMisPases';
import { colores, espacios, radios, tipografia } from '@/tema';
import type { BorradorPase } from '@/tipos/pase';
import { nuevoBorrador, validarBorrador } from '@/utilidades/borradorPase';

/** P6 · Visitas: formulario "Nuevo pase" y lista "Mis pases" (RF15). */
export default function Visitas() {
  const crear = useCrearPase();
  const pases = useMisPases();

  // El borrador se crea una sola vez: la función inicial de useState no se vuelve a ejecutar.
  const [borrador, setBorrador] = useState<BorradorPase>(() => nuevoBorrador());
  // Los errores de validación solo se muestran después del primer intento de generar.
  const [intentado, setIntentado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const { errores, valido } = validarBorrador(borrador);
  const mostrar = intentado ? errores : {};

  /** Valida y crea el pase. Si el servidor lo rechaza, su mensaje en español queda sobre el botón. */
  function generar() {
    setIntentado(true);
    setErrorEnvio(null);
    if (!valido) return;
    crear.mutate(borrador, {
      onSuccess: (pase) => {
        // Formulario limpio para el siguiente pase.
        setBorrador(nuevoBorrador());
        setIntentado(false);
        Alert.alert('Pase creado', `El pase de ${pase.nombre_visitante} está vigente.`);
      },
      onError: (error) =>
        setErrorEnvio(
          error instanceof Error ? error.message : 'No pudimos crear el pase. Inténtalo de nuevo.',
        ),
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
        <Text style={estilos.seccion}>Nuevo pase</Text>
        <View style={estilos.formulario}>
          <CampoTexto
            etiqueta="Nombre del invitado"
            placeholder="Por ejemplo: Carlos Pérez"
            value={borrador.nombre}
            onChangeText={(nombre) => setBorrador((actual) => ({ ...actual, nombre }))}
          />
          {mostrar.nombre ? <Text style={estilos.error}>{mostrar.nombre}</Text> : null}

          <CampoFecha
            etiqueta="Fecha y hora estimada de llegada"
            valor={borrador.llegada}
            alCambiar={(llegada) => setBorrador((actual) => ({ ...actual, llegada }))}
            error={mostrar.llegada}
          />
          <Text style={estilos.ayuda}>
            El pase vale solo el día de la visita, hasta las 11:59 p. m.
          </Text>

          {errorEnvio ? <Text style={estilos.error}>{errorEnvio}</Text> : null}
          <Boton texto="Generar pase" alPresionar={generar} cargando={crear.isPending} />
        </View>

        <Text style={estilos.seccion}>Mis pases</Text>
        {pases.isPending ? (
          <ActivityIndicator color={colores.principal} />
        ) : pases.isError ? (
          <View style={estilos.estado}>
            <Text style={estilos.ayuda}>No pudimos cargar tus pases.</Text>
            <Boton variante="secundario" texto="Reintentar" alPresionar={() => pases.refetch()} />
          </View>
        ) : pases.data.length === 0 ? (
          <Text style={estilos.ayuda}>Todavía no creaste ningún pase.</Text>
        ) : (
          pases.data.map((pase) => <TarjetaPase key={pase.id} pase={pase} />)
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: espacios.entreTarjetas, paddingBottom: 48 },
  seccion: { ...tipografia.titulo, color: colores.texto },
  formulario: {
    gap: 16,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  estado: { gap: espacios.entreTarjetas },
  ayuda: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

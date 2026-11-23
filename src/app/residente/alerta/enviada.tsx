/**
 * Ruta `/residente/alerta/enviada` (rol Residente): pantalla P3b · Alerta enviada del mockup (RF23 y RF24, Sprint 5).
 *
 * Qué hace: confirma que la alerta quedó registrada y muestra su tipo, su ubicación, su hora (en Lima) y su
 * estado ("Activa"). Al abrirse, el teléfono del emisor vibra y suena (`avisarAlertaEnviada`, RF24).
 * Cómo funciona: P3 crea la alerta y navega aquí con `router.replace`, pasando por parámetros de ruta el
 * tipo (`?tipo=medica`), la ubicación ya escrita y la hora de creación. Esta pantalla no vuelve a consultar
 * la base: solo muestra lo que recibe y nunca inventa un dato; si falta un parámetro, esa fila no aparece.
 * El texto dice "quedó registrada" y no "ya fueron avisados": avisar a la guardia y a los vecinos es RF25.
 * Estados: usa "Activa" (no "Pendiente" del mockup), según la corrección 1 de `docs/design/DISENO.md`.
 * Se usa con: `residente/_layout.tsx` (pantalla apilada, sin cabecera y sin gesto de volver) y la pantalla P3
 * (`alerta/tipo.tsx`). Depende de: `src/servicios/avisoDeAlerta.ts`, `Boton` y las reglas de
 * `src/utilidades/alertaEmergencia.ts`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/componentes/formulario/Boton';
import { avisarAlertaEnviada } from '@/servicios/avisoDeAlerta';
import {
  chipsAlerta,
  colores,
  coloresAlerta,
  espacios,
  etiquetasAlerta,
  radios,
  tipografia,
} from '@/tema';
import { esTipoAlerta, textoHoraAlerta, tituloDeTipo } from '@/utilidades/alertaEmergencia';

/** Una fila de la tarjeta de detalle: etiqueta a la izquierda y valor (texto o insignia) a la derecha. */
function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {children}
    </View>
  );
}

/** P3b · Alerta enviada: confirmación visual, vibración y sonido (RF24) y el resumen de la alerta. */
export default function AlertaEnviada() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { tipo, ubicacion, hora } = useLocalSearchParams<{
    tipo?: string;
    ubicacion?: string;
    hora?: string;
  }>();
  const tipoValido = esTipoAlerta(tipo) ? tipo : null;
  const textoHora = hora ? textoHoraAlerta(hora) : '';

  // Una sola vez al llegar a la pantalla: es la confirmación física de que la alerta salió. Sin tipo
  // válido (por ejemplo, tras recargar la app) se usa `seguridad` para que igual vibre y suene.
  useEffect(() => {
    avisarAlertaEnviada(tipoValido ?? 'seguridad');
    // Solo al montar; si cambiara el parámetro no se debe volver a sonar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[
        estilos.contenido,
        { paddingTop: top + 48, paddingBottom: bottom + espacios.margenLateral },
      ]}
    >
      <View style={estilos.halo}>
        <View style={estilos.circulo}>
          <Ionicons name="checkmark" size={44} color={colores.superficie} />
        </View>
      </View>
      <Text accessibilityRole="header" style={estilos.titulo}>
        Alerta enviada
      </Text>
      <Text style={estilos.subtitulo}>Tu alerta quedó registrada. Mantén la calma.</Text>

      <View style={estilos.tarjeta}>
        {tipoValido ? (
          <Fila etiqueta="Tipo">
            <View style={[estilos.insignia, { backgroundColor: coloresAlerta[tipoValido] }]}>
              <Text style={[estilos.textoInsignia, { color: colores.superficie }]}>
                {tituloDeTipo(tipoValido)}
              </Text>
            </View>
          </Fila>
        ) : null}
        {ubicacion ? (
          <Fila etiqueta="Ubicación">
            <Text style={estilos.valor}>{ubicacion}</Text>
          </Fila>
        ) : null}
        {textoHora ? (
          <Fila etiqueta="Hora">
            <Text style={estilos.valor}>{textoHora}</Text>
          </Fila>
        ) : null}
        {tipoValido ? (
          <Fila etiqueta="Estado">
            <View style={[estilos.insignia, { backgroundColor: chipsAlerta.activa.fondo }]}>
              <Text style={[estilos.textoInsignia, { color: chipsAlerta.activa.texto }]}>
                {etiquetasAlerta.activa}
              </Text>
            </View>
          </Fila>
        ) : null}
      </View>

      {/* Empuja el botón al final de la pantalla. */}
      <View style={estilos.espacio} />
      <Boton texto="Volver al inicio" alPresionar={() => router.replace('/residente')} />
    </ScrollView>
  );
}

// Contenido centrado como el mockup; `flexGrow` deja el botón abajo y la pantalla se desplaza si hace falta.
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, paddingHorizontal: espacios.margenLateral, gap: 12 },
  halo: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.suave,
    borderRadius: radios.chip,
  },
  circulo: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.principal,
    borderRadius: radios.chip,
  },
  titulo: { ...tipografia.titulo, fontSize: 28, textAlign: 'center', color: colores.texto },
  subtitulo: { ...tipografia.cuerpo, textAlign: 'center', color: colores.textoSecundario },
  tarjeta: {
    marginTop: 12,
    paddingHorizontal: 20,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  fila: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  etiqueta: { ...tipografia.cuerpo, color: colores.textoSecundario },
  valor: { ...tipografia.subtitulo, flexShrink: 1, textAlign: 'right', color: colores.texto },
  insignia: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radios.chip },
  textoInsignia: { ...tipografia.subtitulo, fontSize: 14 },
  espacio: { flexGrow: 1, minHeight: 16 },
});

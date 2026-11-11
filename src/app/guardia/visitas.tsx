/**
 * Ruta `/guardia/visitas` (rol Guardia): Visitas de hoy y registro de salida (sin mockup, ver
 * docs/design/DISENO.md). RF20.
 *
 * Qué hace: lista las visitas que ingresaron hoy, con su unidad y la hora de ingreso. Las que siguen
 * dentro tienen el botón "Registrar salida"; las que ya salieron muestran la hora de salida.
 * Cómo funciona: la lista sale de `pases_visita` (RLS deja ver al guardia solo los pases de hoy en
 * hora de Lima). La salida la registra la Edge Function `validar-pase` con la acción `salida`; la base
 * impide que la salida sea anterior al ingreso.
 * Se usa con: `src/hooks/usePases.ts`, `src/repositorios/pases.ts` (tipos y mensajes), `Boton`,
 * `Insignia`, el tema y `guardia/_layout.tsx`, que registra la ruta. Se llega desde el Escáner (P11).
 */
import { IconoCuadro } from '@/componentes/IconoCuadro';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { Insignia } from '@/componentes/Insignia';
import { useRegistrarSalida, useVisitasDeHoy } from '@/hooks/usePases';
import { mensajeDeErrorPase } from '@/repositorios/pases';
import { chipsPase, colores, espacios, radios, sombras, tipografia } from '@/tema';
import { soloHora } from '@/utilidades/fechas';

/** Lista de visitas de hoy para registrar su salida (RF20). */
export default function VisitasDeHoy() {
  const visitas = useVisitasDeHoy();
  const salida = useRegistrarSalida();
  const [error, setError] = useState<string | null>(null);

  /** Registra la salida de una visita y muestra el error si falla. */
  function registrar(paseId: string) {
    setError(null);
    salida.mutate(paseId, { onError: (e) => setError(mensajeDeErrorPase(e)) });
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl
          refreshing={visitas.isRefetching}
          onRefresh={() => void visitas.refetch()}
        />
      }
    >
      {error ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      ) : null}

      {visitas.isPending ? (
        <ActivityIndicator color={colores.principal} style={estilos.indicador} />
      ) : visitas.isError ? (
        <>
          <Text accessibilityRole="alert" style={estilos.error}>
            No pudimos cargar las visitas. Revisa tu conexión.
          </Text>
          <Boton variante="secundario" texto="Reintentar" alPresionar={() => visitas.refetch()} />
        </>
      ) : visitas.data.length === 0 ? (
        <EstadoVacio icono="users" mensaje="Hoy todavía no ha ingresado ninguna visita." />
      ) : (
        visitas.data.map((visita) => (
          <View key={visita.id} style={estilos.tarjeta}>
            <View style={estilos.fila}>
              <IconoCuadro icono="user" tamano={40} />
              <Text style={[estilos.nombre, estilos.flexible]}>{visita.nombre_visitante}</Text>
              <Insignia
                texto={visita.salida_en ? 'Salió' : 'Dentro'}
                color={visita.salida_en ? chipsPase.usado : chipsPase.vigente}
              />
            </View>
            <Text style={estilos.detalle}>{visita.unidad}</Text>
            <Text style={estilos.detalle}>
              {visita.ingreso_en ? `Ingresó a las ${soloHora(visita.ingreso_en)}` : ''}
              {visita.salida_en ? ` · salió a las ${soloHora(visita.salida_en)}` : ''}
            </Text>
            {!visita.salida_en ? (
              <Boton
                variante="secundario"
                icono="log-out"
                texto="Registrar salida"
                alPresionar={() => registrar(visita.id)}
                // Solo gira el botón de la visita que se está registrando.
                cargando={salida.isPending && salida.variables === visita.id}
              />
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: espacios.entreTarjetas },
  indicador: { marginTop: 32 },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 8,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexible: { flex: 1 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

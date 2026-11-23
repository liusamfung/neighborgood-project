/**
 * ResultadoEscaneo: la tarjeta que ve el guardia después de escanear un pase (mockup P11).
 *
 * Qué hace: si el pase es válido, dibuja la tarjeta verde "Pase válido" con la hora en que quedó
 * registrado el ingreso (el pase ya está usado, RF19), la visita, la unidad y quién autorizó (RF18).
 * Si se rechazó, dibuja la tarjeta roja con el motivo que respondió la Edge Function ("Pase no válido o
 * vencido", "Pase ya usado", "Pase anulado"). Las dos terminan con el botón "Escanear otro pase".
 * Se usa con: `src/app/guardia/(tabs)/escaner.tsx`.
 * Depende de: `src/tipos/validacionPase.ts`, `Boton`, `formatearHora` de `src/utilidades/formatosPase.ts`
 * y los colores de `src/tema` (`chipsPase`).
 */
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { chipsPase, colores, radios, tipografia } from '@/tema';
import type { PaseValidado } from '@/tipos/validacionPase';
import { formatearHora } from '@/utilidades/formatosPase';

/** Lo que se muestra: el pase válido o el motivo del rechazo (nunca los dos). */
export type Resultado = { pase: PaseValidado; motivo?: never } | { pase?: never; motivo: string };

/** Hora local del teléfono de un instante ISO, por ejemplo "6:42 p. m." (el guardia está en Lima). */
function horaDeIngreso(instante: string): string {
  return new Date(instante).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
}

/** Renglón "etiqueta — valor" de la tarjeta del pase válido (Visita, Va a, Autorizó). */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      <Text style={estilos.valorDato}>{valor}</Text>
    </View>
  );
}

/**
 * Tarjeta del resultado de un escaneo.
 *
 * @param resultado el pase válido o el motivo del rechazo.
 * @param alEscanearOtro limpia el resultado y vuelve a la cámara.
 */
export function ResultadoEscaneo({
  resultado,
  alEscanearOtro,
}: {
  resultado: Resultado;
  alEscanearOtro: () => void;
}) {
  if (resultado.pase) {
    const { pase } = resultado;
    return (
      <View style={[estilos.tarjeta, estilos.valido]}>
        <Text
          accessibilityRole="alert"
          style={[estilos.veredicto, { color: chipsPase.vigente.texto }]}
        >
          ✅ Pase válido
        </Text>
        {/* El pase ya quedó usado: otro escaneo del mismo QR responderá "Pase ya usado" (RF19). */}
        <Text style={[estilos.texto, { color: chipsPase.vigente.texto }]}>
          Ingreso registrado a las {horaDeIngreso(pase.ingreso_en)}
        </Text>
        <Dato etiqueta="Visita" valor={pase.nombre_visitante} />
        <Dato etiqueta="Va a" valor={pase.unidad} />
        {pase.autorizo ? <Dato etiqueta="Autorizó" valor={pase.autorizo} /> : null}
        <Dato etiqueta="Llegada estimada" valor={formatearHora(pase.hora_estimada)} />
        <Boton texto="Escanear otro pase" alPresionar={alEscanearOtro} />
      </View>
    );
  }
  return (
    <View style={[estilos.tarjeta, estilos.rechazado]}>
      <Text
        accessibilityRole="alert"
        style={[estilos.veredicto, { color: chipsPase.anulado.texto }]}
      >
        ⛔ {resultado.motivo}
      </Text>
      <Text style={[estilos.texto, { color: chipsPase.anulado.texto }]}>
        No dejes ingresar a la visita con este pase.
      </Text>
      <Boton texto="Escanear otro pase" alPresionar={alEscanearOtro} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { padding: 20, gap: 12, borderWidth: 2, borderRadius: radios.tarjeta },
  valido: { backgroundColor: chipsPase.vigente.fondo, borderColor: chipsPase.vigente.texto },
  rechazado: { backgroundColor: chipsPase.anulado.fondo, borderColor: colores.peligroBorde },
  veredicto: tipografia.titulo,
  texto: tipografia.cuerpo,
  // Renglón de dato: etiqueta gris a la izquierda y valor en negrita a la derecha.
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  etiquetaDato: { ...tipografia.cuerpo, color: colores.textoSecundario },
  valorDato: { ...tipografia.subtitulo, flexShrink: 1, textAlign: 'right', color: colores.texto },
});

/**
 * TarjetaPase: una fila de la lista "Mis pases" con el invitado, el día y la hora, y el estado del pase.
 *
 * Qué hace: muestra el nombre del invitado, "mar, 10 nov · 6:30 p. m." y una insignia con el estado
 * (Vigente, Usado o Anulado) con los colores del sistema de diseño. Si el pase sigue vigente, debajo
 * van los botones "Compartir", que manda la imagen del QR (RF17), y "Anular" (RF22). Un pase usado,
 * anulado o de un día que ya pasó no muestra botones: el guardia lo rechazaría igual (el pase vale solo
 * el día de la visita, RNF3).
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`. Más adelante abrirá el código QR del pase (RF16).
 * Depende de: `src/tipos/pase.ts`, `src/utilidades/formatosPase.ts`, `src/tema` (`chipsPase`),
 * `aFechaIso` de `src/utilidades/borradorPase.ts`, `BotonCompartirPase` y `BotonAnularPase`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { BotonAnularPase } from '@/componentes/visitas/BotonAnularPase';
import { BotonCompartirPase } from '@/componentes/visitas/BotonCompartirPase';
import { chipsPase, colores, radios, tipografia } from '@/tema';
import type { EstadoPase, Pase } from '@/tipos/pase';
import { aFechaIso } from '@/utilidades/borradorPase';
import { formatearFecha, formatearHora } from '@/utilidades/formatosPase';

/** Texto que ve el residente para cada estado del pase (RF22). */
const etiquetasPase: Record<EstadoPase, string> = {
  vigente: 'Vigente',
  usado: 'Usado',
  anulado: 'Anulado',
};

/**
 * Tarjeta de un pase: nombre y horario a la izquierda, estado a la derecha y, si está vigente,
 * los botones "Compartir" (RF17) y "Anular" (RF22) debajo.
 */
export function TarjetaPase({ pase }: { pase: Pase }) {
  const chip = chipsPase[pase.estado];
  // Solo se comparte un pase vigente de hoy o de un día futuro. Las fechas YYYY-MM-DD se comparan
  // como texto, con el mismo "hoy" que usa la validación al crear el pase (`aFechaIso`).
  const compartible = pase.estado === 'vigente' && pase.fecha_visita >= aFechaIso(new Date());
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        <View style={estilos.textos}>
          <Text style={estilos.nombre}>{pase.nombre_visitante}</Text>
          <Text style={estilos.horario}>
            {formatearFecha(pase.fecha_visita)} · {formatearHora(pase.hora_estimada)}
          </Text>
        </View>
        <View style={[estilos.chip, { backgroundColor: chip.fondo }]}>
          <Text style={[estilos.textoChip, { color: chip.texto }]}>
            {etiquetasPase[pase.estado]}
          </Text>
        </View>
      </View>
      {compartible ? (
        // Compartir (RF17) y Anular (RF22) van lado a lado, cada uno con la mitad del ancho.
        <View style={estilos.acciones}>
          <View style={estilos.accion}>
            <BotonCompartirPase pase={pase} />
          </View>
          <View style={estilos.accion}>
            <BotonAnularPase pase={pase} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: 12,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textos: { flex: 1, gap: 2 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  horario: { ...tipografia.cuerpo, color: colores.textoSecundario },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radios.chip },
  textoChip: { ...tipografia.cuerpo, fontFamily: tipografia.subtitulo.fontFamily },
  acciones: { flexDirection: 'row', gap: 10 },
  accion: { flex: 1 },
});

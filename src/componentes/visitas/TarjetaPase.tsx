/**
 * TarjetaPase: una fila de la lista "Mis pases" con el invitado, el día y la hora, y el estado del pase.
 *
 * Qué hace: muestra el nombre del invitado, "mar, 10 nov · 6:30 p. m." y una insignia con el estado
 * (Vigente, Usado o Anulado) con los colores del sistema de diseño.
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`. Más adelante abrirá el código QR del pase (RF16).
 * Depende de: `src/tipos/pase.ts`, `src/utilidades/formatosPase.ts` y `src/tema` (`chipsPase`).
 */
import { StyleSheet, Text, View } from 'react-native';

import { chipsPase, colores, radios, tipografia } from '@/tema';
import type { EstadoPase, Pase } from '@/tipos/pase';
import { formatearFecha, formatearHora } from '@/utilidades/formatosPase';

/** Texto que ve el residente para cada estado del pase (RF22). */
const etiquetasPase: Record<EstadoPase, string> = {
  vigente: 'Vigente',
  usado: 'Usado',
  anulado: 'Anulado',
};

/** Tarjeta de un pase: nombre y horario a la izquierda, estado a la derecha. */
export function TarjetaPase({ pase }: { pase: Pase }) {
  const chip = chipsPase[pase.estado];
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.textos}>
        <Text style={estilos.nombre}>{pase.nombre_visitante}</Text>
        <Text style={estilos.horario}>
          {formatearFecha(pase.fecha_visita)} · {formatearHora(pase.hora_estimada)}
        </Text>
      </View>
      <View style={[estilos.chip, { backgroundColor: chip.fondo }]}>
        <Text style={[estilos.textoChip, { color: chip.texto }]}>{etiquetasPase[pase.estado]}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  textos: { flex: 1, gap: 2 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  horario: { ...tipografia.cuerpo, color: colores.textoSecundario },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radios.chip },
  textoChip: { ...tipografia.cuerpo, fontFamily: tipografia.subtitulo.fontFamily },
});

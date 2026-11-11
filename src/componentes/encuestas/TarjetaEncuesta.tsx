/**
 * TarjetaEncuesta: una encuesta en la lista; al tocarla abre su pantalla (votar o ver resultados).
 *
 * Qué hace: muestra la categoría, la insignia "Obligatoria" si la prioridad es alta (RF14), el título,
 * cuándo cierra o cerró y una línea de estado que cambia según quién la mira: al residente le dice si
 * su unidad ya votó (RF9); a la directiva, cuántas unidades participaron.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (P4) y `src/app/directiva/(tabs)/encuestas.tsx`.
 * Depende de: `Insignia`, las utilidades de fechas, el tema y el tipo `EncuestaListada`.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Insignia } from '@/componentes/Insignia';
import type { EncuestaListada } from '@/repositorios/encuestas';
import { chipsIncidencia, chipsPase, colores, radios, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/** Datos que recibe la tarjeta. */
type Props = {
  encuesta: EncuestaListada;
  /** true si la encuesta ya pasó su `cierra_en`; lo calcula la pantalla con `useAhora`. */
  cerrada: boolean;
  /** Quién mira la lista: cambia la línea de estado. */
  rol: 'residente' | 'directiva';
  /** Se llama al tocar la tarjeta; la pantalla decide a qué ruta ir. */
  alPresionar: () => void;
};

/** Tarjeta de una encuesta con su estado (abierta o cerrada) y su prioridad. */
export function TarjetaEncuesta({ encuesta, cerrada, rol, alPresionar }: Props) {
  const votos = encuesta.votos.length;
  // El residente solo recibe el voto de su unidad (RLS); la directiva recibe el de todas.
  const estado =
    rol === 'directiva'
      ? `${votos} ${votos === 1 ? 'unidad votó' : 'unidades votaron'}`
      : votos > 0
        ? 'Tu unidad ya votó'
        : cerrada
          ? 'Tu unidad no votó'
          : 'Pendiente de tu voto';

  return (
    <Pressable accessibilityRole="button" onPress={alPresionar} style={estilos.tarjeta}>
      <View style={estilos.insignias}>
        <Insignia texto="Encuesta" color={chipsIncidencia.en_atencion} />
        <Insignia texto={encuesta.categorias_aviso.nombre} />
        {encuesta.prioridad === 'alta' ? (
          <Insignia texto="Obligatoria" color={chipsIncidencia.pendiente} />
        ) : null}
        {cerrada ? <Insignia texto="Cerrada" color={chipsPase.usado} /> : null}
      </View>
      <Text style={estilos.titulo}>{encuesta.titulo}</Text>
      <Text style={estilos.detalle}>
        {cerrada ? 'Cerró el ' : 'Cierra el '}
        {fechaYHora(encuesta.cierra_en)}
      </Text>
      <Text style={estilos.estado}>{estado}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    padding: 16,
    gap: 6,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  titulo: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  estado: { ...tipografia.subtitulo, fontSize: 14, color: colores.principal },
});

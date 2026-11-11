/**
 * TarjetaEncuesta: una encuesta en la lista; al tocarla abre su pantalla (votar o ver resultados).
 *
 * Qué hace: con la misma forma que `TarjetaAviso` (cuadro con ícono, línea teal, título), muestra la
 * categoría, la insignia "Obligatoria" si la prioridad es alta (RF14), cuándo cierra o cerró y una
 * línea de estado que cambia según quién la mira: al residente le dice si su unidad ya votó (RF9); a
 * la directiva, cuántas unidades participaron. Un punto ámbar marca la encuesta que espera el voto.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (P4) y `src/app/directiva/(tabs)/encuestas.tsx`.
 * Depende de: `IconoCuadro`, `Insignia`, las utilidades de fechas, el tema y el tipo `EncuestaListada`.
 */
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconoCuadro } from '@/componentes/IconoCuadro';
import { Insignia } from '@/componentes/Insignia';
import type { EncuestaListada } from '@/repositorios/encuestas';
import { chipsIncidencia, chipsPase, colores, radios, sombras, tipografia } from '@/tema';
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
  // RF13: a quién va dirigida; con sectores se listan sus nombres.
  const destino = encuesta.para_todos
    ? 'Todo el condominio'
    : encuesta.encuesta_sectores.map((s) => s.sectores.nombre).join(', ') || 'Por sector';
  // El residente solo recibe el voto de su unidad (RLS); la directiva recibe el de todas.
  const pendiente = rol === 'residente' && votos === 0 && !cerrada;
  const estado =
    rol === 'directiva'
      ? `${votos} ${votos === 1 ? 'unidad votó' : 'unidades votaron'}`
      : votos > 0
        ? 'Tu unidad ya votó'
        : cerrada
          ? 'Tu unidad no votó'
          : 'Pendiente de tu voto';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPresionar}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <IconoCuadro icono="check-square" color={chipsIncidencia.en_atencion} />
      <View style={estilos.cuerpo}>
        <View style={estilos.fila}>
          <Text style={[estilos.etiqueta, estilos.flexible]}>
            Encuesta · {encuesta.categorias_aviso.nombre}
          </Text>
          {/* Punto ámbar del mockup: hay algo por hacer. */}
          {pendiente ? <View style={estilos.punto} /> : null}
        </View>
        <Text style={estilos.titulo}>{encuesta.titulo}</Text>
        <Text style={estilos.detalle}>
          {destino} · {cerrada ? 'cerró el ' : 'cierra el '}
          {fechaYHora(encuesta.cierra_en)}
        </Text>
        <View style={estilos.insignias}>
          {encuesta.prioridad === 'alta' ? (
            <Insignia texto="Obligatoria" color={chipsIncidencia.pendiente} />
          ) : null}
          {cerrada ? <Insignia texto="Cerrada" color={chipsPase.usado} /> : null}
          <Text style={[estilos.estado, pendiente && estilos.estadoPendiente]}>{estado}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colores.textoSecundario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    ...sombras.tarjeta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  presionada: { opacity: 0.9 },
  cuerpo: { flex: 1, gap: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexible: { flex: 1 },
  etiqueta: { ...tipografia.etiqueta, color: chipsIncidencia.en_atencion.texto },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colores.acento },
  titulo: { ...tipografia.subtitulo, fontSize: 17, color: colores.texto },
  detalle: { ...tipografia.cuerpo, fontSize: 12, color: colores.textoSecundario },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  estado: { ...tipografia.subtitulo, fontSize: 13, color: colores.principal },
  estadoPendiente: { color: chipsIncidencia.pendiente.texto },
});

/**
 * TarjetaVisita: una fila de "Visitas de hoy" del guardia, con su estado en la garita (RF20).
 *
 * Qué hace: muestra el visitante, la unidad y una insignia: "Esperada" (pase vigente, aún no llega),
 * "Adentro" (ingresó y no salió) o "Salió". Debajo van las horas exactas de ingreso y salida. Si la visita
 * está adentro, ofrece "Registrar salida", que pide confirmación y llama a la Edge Function.
 * Se usa con: `src/app/guardia/visitas.tsx`.
 * Depende de: `src/tipos/validacionPase.ts` (`VisitaDeHoy`), `src/hooks/useRegistrarSalida.ts`, `Boton`,
 * `Insignia`, `formatearHora` (`formatosPase.ts`), `formatearInstante` (`formatosVisita.ts`) y el tema.
 */
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { Insignia } from '@/componentes/Insignia';
import { useRegistrarSalida } from '@/hooks/useRegistrarSalida';
import { chipsPase, colores, radios, tipografia } from '@/tema';
import type { VisitaDeHoy } from '@/tipos/validacionPase';
import { formatearHora } from '@/utilidades/formatosPase';
import { formatearInstante } from '@/utilidades/formatosVisita';

/** Estado de la visita en la garita, calculado con `ingreso_en` y `salida_en` (no se guarda). */
type EstadoGarita = 'esperada' | 'adentro' | 'salio';

/** Texto y colores de la insignia de cada estado (reutiliza los pares de `chipsPase`). */
const insignias: Record<
  EstadoGarita,
  { texto: string; colores: { fondo: string; texto: string } }
> = {
  esperada: { texto: 'Esperada', colores: chipsPase.vigente },
  adentro: { texto: 'Adentro', colores: { fondo: colores.suave, texto: colores.principal } },
  salio: { texto: 'Salió', colores: chipsPase.usado },
};

/** Calcula el estado de la visita: sin ingreso está esperada; con ingreso y sin salida, adentro. */
function estadoDe(visita: VisitaDeHoy): EstadoGarita {
  if (!visita.ingreso_en) return 'esperada';
  return visita.salida_en ? 'salio' : 'adentro';
}

/** Texto de la unidad con su sector, por ejemplo "Torre A · 302". */
function textoUnidad(visita: VisitaDeHoy): string {
  if (!visita.unidades) return '';
  const sector = visita.unidades.sectores?.nombre;
  return sector ? `${sector} · ${visita.unidades.codigo}` : visita.unidades.codigo;
}

/** Tarjeta de una visita de hoy con su botón "Registrar salida" si está adentro. */
export function TarjetaVisita({ visita }: { visita: VisitaDeHoy }) {
  const salida = useRegistrarSalida();
  const estado = estadoDe(visita);

  /** Pide confirmación (no se puede deshacer) y registra la salida con la hora exacta del servidor. */
  function confirmarSalida() {
    Alert.alert('Registrar salida', `¿${visita.nombre_visitante} salió del condominio?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Registrar salida',
        onPress: () =>
          salida.mutate(visita.id, {
            onError: (error) =>
              Alert.alert(
                'No se registró la salida',
                error instanceof Error ? error.message : 'Inténtalo de nuevo.',
              ),
          }),
      },
    ]);
  }

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        <View style={estilos.textos}>
          <Text style={estilos.nombre}>{visita.nombre_visitante}</Text>
          <Text style={estilos.detalle}>{textoUnidad(visita)}</Text>
        </View>
        <Insignia texto={insignias[estado].texto} colores={insignias[estado].colores} />
      </View>
      <Text style={estilos.detalle}>
        {visita.ingreso_en
          ? `Ingresó a las ${formatearInstante(visita.ingreso_en)}`
          : `Llega a las ${formatearHora(visita.hora_estimada)}`}
        {visita.salida_en ? ` · Salió a las ${formatearInstante(visita.salida_en)}` : ''}
      </Text>
      {estado === 'adentro' ? (
        <Boton
          variante="secundario"
          texto="Registrar salida"
          alPresionar={confirmarSalida}
          cargando={salida.isPending}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: 10,
    padding: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textos: { flex: 1, gap: 2 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
});

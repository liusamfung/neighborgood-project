/** RF13: selector explícito de todo el condominio o varios sectores para P13/P14.
 * Conserva sectorIds=[] únicamente para el modo todos de las RPC de publicación existentes.
 */
import { Text, View } from 'react-native';
import { ChipsSeleccion } from './ChipsSeleccion';
import { colores, tipografia } from '@/tema';
import type { ModoDestino } from '@/utilidades/destinoPublicacion';

/** Quitar el último sector mantiene el modo sectores; el padre valida antes de publicar. */
export function DestinoPublicacion({
  modo,
  ids,
  sectores,
  alCambiar,
  error,
}: {
  modo: ModoDestino;
  ids: string[];
  sectores: { id: string; nombre: string }[];
  alCambiar: (modo: ModoDestino, ids: string[]) => void;
  error?: string | null;
}) {
  return (
    <View style={{ gap: 12 }}>
      <ChipsSeleccion
        etiqueta="Dirigido a"
        opciones={[
          { id: 'todos', texto: 'Todo el condominio' },
          { id: 'sectores', texto: 'Elegir sectores' },
        ]}
        seleccionados={[modo]}
        alCambiar={([valor]) => {
          // Tocar el modo ya activo no debe borrar los sectores elegidos.
          const siguiente = valor === 'todos' ? 'todos' : 'sectores';
          if (siguiente !== modo) alCambiar(siguiente, []);
        }}
      />
      {modo === 'sectores' ? (
        <ChipsSeleccion
          etiqueta="Sectores destinatarios"
          multiple
          opciones={sectores.map((s) => ({ id: s.id, texto: s.nombre }))}
          seleccionados={ids}
          alCambiar={(nuevos) => alCambiar('sectores', nuevos)}
        />
      ) : null}
      <Text style={{ ...tipografia.cuerpo, color: colores.textoSecundario }}>
        {modo === 'todos'
          ? 'Lo verán todos los residentes del condominio.'
          : ids.length
            ? `Solo lo verán los residentes de: ${sectores
                .filter((s) => ids.includes(s.id))
                .map((s) => s.nombre)
                .join(', ')}.`
            : sectores.length
              ? 'Selecciona uno o varios sectores.'
              : 'No hay sectores disponibles. Puedes elegir Todo el condominio.'}
      </Text>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ ...tipografia.cuerpo, color: colores.peligroTexto }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

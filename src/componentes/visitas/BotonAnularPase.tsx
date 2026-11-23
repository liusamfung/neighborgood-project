/**
 * BotonAnularPase: botón "Anular" de un pase vigente (RF22).
 *
 * Qué hace: pide confirmación y anula el pase. Después de anularlo el pase ya no sirve para entrar y no
 * se puede reactivar, por eso la confirmación lo dice. Al terminar avisa con un `Alert` y la lista "Mis
 * pases" se refresca sola (el hook vence la caché `['pases']`), así la tarjeta pasa a "Anulado" y el
 * botón desaparece.
 * Cómo funciona: usa `useAnularPase`; si la base rechaza el cambio (el pase ya fue usado o anulado),
 * muestra el motivo en español. Mientras espera la respuesta, el botón muestra un indicador y no
 * responde a más toques.
 * Se usa con: `src/componentes/visitas/TarjetaPase.tsx` (solo en pases vigentes).
 * Depende de: `src/hooks/useAnularPase.ts`, `src/repositorios/pases.ts` (`mensajeDeErrorAnular`) y `src/tema`.
 */
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useAnularPase } from '@/hooks/useAnularPase';
import { mensajeDeErrorAnular } from '@/repositorios/pases';
import { colores, radios, tamanos, tipografia } from '@/tema';
import type { Pase } from '@/tipos/pase';

/** Botón "Anular" con confirmación previa, en el rojo suave de peligro del sistema de diseño. */
export function BotonAnularPase({ pase }: { pase: Pase }) {
  const anular = useAnularPase();

  /** Pide confirmación; solo si el residente acepta, anula el pase. */
  function confirmar() {
    Alert.alert(
      'Anular pase',
      `El pase de ${pase.nombre_visitante} dejará de servir para entrar y no se puede reactivar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular pase',
          style: 'destructive',
          onPress: () =>
            anular.mutate(pase.id, {
              onSuccess: () =>
                Alert.alert('Pase anulado', `El pase de ${pase.nombre_visitante} ya no es válido.`),
              onError: (error) => Alert.alert('No se pudo anular', mensajeDeErrorAnular(error)),
            }),
        },
      ],
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Anular el pase de ${pase.nombre_visitante}`}
      accessibilityState={{ busy: anular.isPending, disabled: anular.isPending }}
      onPress={confirmar}
      disabled={anular.isPending}
      style={estilos.boton}
    >
      {anular.isPending ? (
        <ActivityIndicator color={colores.peligroTexto} />
      ) : (
        <Text style={estilos.texto}>Anular</Text>
      )}
    </Pressable>
  );
}

// Mismo tamaño que "Compartir", con el borde y el texto rojos de "Peligro suave" (DISENO.md).
const estilos = StyleSheet.create({
  boton: {
    minHeight: tamanos.areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radios.boton,
    borderWidth: 1,
    borderColor: colores.peligroBorde,
  },
  texto: { ...tipografia.subtitulo, color: colores.peligroTexto },
});

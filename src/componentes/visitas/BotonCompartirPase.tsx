/**
 * BotonCompartirPase: botón "Compartir" de un pase vigente (RF17).
 *
 * Qué hace: al tocarlo, genera la imagen del QR del pase y abre el menú de compartir del teléfono.
 * Cómo funciona: dibuja el QR del pase (su `id`, el UUID que generó Postgres) con
 * `react-native-qrcode-svg`, fuera de la vista: solo se usa como fuente de la imagen. Mostrar el QR
 * en pantalla es tarea de RF16; cuando exista, este botón puede reutilizar ese mismo QR. Al tocar,
 * pide al QR su imagen en base64 (`toDataURL`) y se la pasa a `compartirPase`.
 * Se usa con: `src/componentes/visitas/TarjetaPase.tsx` (solo en pases vigentes).
 * Depende de: `react-native-qrcode-svg`, `src/utilidades/compartirPase.ts` y `src/tema`.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colores, radios, tamanos, tipografia } from '@/tema';
import type { Pase } from '@/tipos/pase';
import { compartirPase } from '@/utilidades/compartirPase';

/** Lo mínimo del objeto que entrega `getRef` de `react-native-qrcode-svg`. */
type ReferenciaQR = { toDataURL: (alListo: (base64: string) => void) => void };

/** Botón "Compartir" con el QR oculto que produce la imagen. */
export function BotonCompartirPase({ pase }: { pase: Pase }) {
  const qr = useRef<ReferenciaQR | null>(null);
  const [compartiendo, setCompartiendo] = useState(false);

  /** Pide la imagen al QR y abre el menú de compartir; evita dobles toques mientras trabaja. */
  function compartir() {
    if (compartiendo || !qr.current) return;
    setCompartiendo(true);
    qr.current.toDataURL((base64) => {
      compartirPase(pase, base64)
        .catch((error) => console.warn('No se pudo compartir el pase', error))
        .finally(() => setCompartiendo(false));
    });
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Compartir el pase de ${pase.nombre_visitante}`}
        onPress={compartir}
        disabled={compartiendo}
        style={estilos.boton}
      >
        {compartiendo ? (
          <ActivityIndicator color={colores.principal} />
        ) : (
          <Text style={estilos.texto}>Compartir</Text>
        )}
      </Pressable>
      {/* QR fuera de la vista: no se ve, pero está montado para poder exportar su imagen. */}
      <View style={estilos.oculto} pointerEvents="none" accessibilityElementsHidden>
        <QRCode
          value={pase.id}
          size={512}
          quietZone={24}
          backgroundColor="#FFFFFF"
          getRef={(referencia: ReferenciaQR) => {
            qr.current = referencia;
          }}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: tamanos.areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radios.boton,
    borderWidth: 1,
    borderColor: colores.principal,
  },
  texto: { ...tipografia.subtitulo, color: colores.principal },
  // Se saca de la pantalla en vez de ocultarlo con `display: none`, que no lo dibujaría.
  oculto: { position: 'absolute', left: -10000, top: 0, opacity: 0 },
});

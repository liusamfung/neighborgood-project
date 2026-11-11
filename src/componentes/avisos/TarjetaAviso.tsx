/**
 * TarjetaAviso: un aviso en la lista; al tocarlo se abre y muestra el mensaje completo y su imagen.
 *
 * Qué hace: muestra la categoría, el título, la vigencia y un resumen del mensaje. Abierta, muestra
 * el mensaje completo y la imagen adjunta (RF7), que se pide a Storage solo en ese momento porque el
 * bucket es privado y cada imagen necesita una URL firmada.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (P4) y `src/app/directiva/(tabs)/avisos.tsx`.
 * Depende de: `src/hooks/useAvisos.ts` (`useImagenAviso`), `Insignia`, `expo-image`, las utilidades de
 * fechas y el tema.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Insignia } from '@/componentes/Insignia';
import { useImagenAviso } from '@/hooks/useAvisos';
import type { AvisoListado } from '@/repositorios/avisos';
import { chipsPase, colores, radios, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/** Datos que recibe la tarjeta. */
type Props = {
  aviso: AvisoListado;
  /** true si el aviso ya pasó su `vigente_hasta` (se muestra en el historial, RF11). */
  vencido: boolean;
};

/** Tarjeta de un aviso; se abre y se cierra al tocarla. */
export function TarjetaAviso({ aviso, vencido }: Props) {
  const [abierta, setAbierta] = useState(false);
  const imagen = useImagenAviso(aviso.imagen_path, abierta);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: abierta }}
      onPress={() => setAbierta((a) => !a)}
      style={estilos.tarjeta}
    >
      <View style={estilos.insignias}>
        <Insignia texto={aviso.categorias_aviso.nombre} />
        {vencido ? <Insignia texto="Vencido" color={chipsPase.usado} /> : null}
      </View>
      <Text style={estilos.titulo}>{aviso.titulo}</Text>
      <Text style={estilos.detalle}>
        {vencido ? 'Venció el ' : 'Vigente hasta el '}
        {fechaYHora(aviso.vigente_hasta)}
      </Text>
      {/* Cerrada muestra dos líneas del mensaje; abierta, todo. */}
      <Text style={estilos.mensaje} numberOfLines={abierta ? undefined : 2}>
        {aviso.descripcion}
      </Text>

      {abierta && aviso.imagen_path ? (
        imagen.isPending ? (
          <ActivityIndicator color={colores.principal} />
        ) : imagen.isError ? (
          <Text style={estilos.detalle}>No pudimos cargar la imagen.</Text>
        ) : (
          <Image
            source={{ uri: imagen.data }}
            style={estilos.imagen}
            contentFit="cover"
            accessibilityLabel={`Imagen del aviso ${aviso.titulo}`}
          />
        )
      ) : null}
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
  mensaje: { ...tipografia.cuerpo, color: colores.texto },
  imagen: { width: '100%', aspectRatio: 16 / 9, borderRadius: radios.campo, marginTop: 6 },
});

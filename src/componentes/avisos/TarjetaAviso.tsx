/**
 * TarjetaAviso: un aviso en la lista; al tocarlo se abre y muestra el mensaje completo y su imagen.
 *
 * Qué hace: sigue el mockup P4: un cuadro con el ícono de la categoría, la línea "CATEGORÍA · DESTINO"
 * en teal, el título, un resumen del mensaje y la vigencia. Abierta, muestra el mensaje completo y la
 * imagen adjunta (RF7), que se pide a Storage solo en ese momento porque el bucket es privado y cada
 * imagen necesita una URL firmada.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx` (P4) y `src/app/directiva/(tabs)/avisos.tsx`.
 * Depende de: `src/hooks/useAvisos.ts` (`useImagenAviso`), `IconoCuadro`, `Insignia`, `expo-image`, las
 * utilidades de fechas y el tema.
 */
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconoCuadro, type NombreIcono } from '@/componentes/IconoCuadro';
import { Insignia } from '@/componentes/Insignia';
import { useImagenAviso } from '@/hooks/useAvisos';
import type { AvisoListado } from '@/repositorios/avisos';
import { chipsPase, colores, radios, sombras, tipografia } from '@/tema';
import { fechaYHora } from '@/utilidades/fechas';

/** Datos que recibe la tarjeta. */
type Props = {
  aviso: AvisoListado;
  /** true si el aviso ya pasó su `vigente_hasta` (se muestra en el historial, RF11). */
  vencido: boolean;
};

/**
 * Elige el ícono de una categoría por palabras de su nombre. Las categorías salen de la tabla
 * `categorias_aviso` y la directiva puede crear otras: las que no coinciden usan la campana.
 */
export function iconoDeCategoria(nombre: string): NombreIcono {
  const n = nombre.toLowerCase();
  if (n.includes('manten')) return 'tool';
  if (n.includes('segur')) return 'shield';
  if (n.includes('evento')) return 'calendar';
  if (n.includes('pago') || n.includes('cuota') || n.includes('finan')) return 'credit-card';
  if (n.includes('comun')) return 'users';
  return 'bell';
}

/** Tarjeta de un aviso; se abre y se cierra al tocarla. */
export function TarjetaAviso({ aviso, vencido }: Props) {
  const [abierta, setAbierta] = useState(false);
  const imagen = useImagenAviso(aviso.imagen_path, abierta);
  const categoria = aviso.categorias_aviso.nombre;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: abierta }}
      onPress={() => setAbierta((a) => !a)}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <View style={estilos.fila}>
        <IconoCuadro icono={iconoDeCategoria(categoria)} />
        <View style={estilos.cuerpo}>
          <Text style={estilos.etiqueta}>
            {categoria} · {aviso.para_todos ? 'Todo el condominio' : 'Tu sector'}
          </Text>
          <Text style={estilos.titulo}>{aviso.titulo}</Text>
          {/* Cerrada muestra dos líneas del mensaje; abierta, todo. */}
          <Text style={estilos.mensaje} numberOfLines={abierta ? undefined : 2}>
            {aviso.descripcion}
          </Text>
          <View style={estilos.pie}>
            <Text style={[estilos.detalle, estilos.flexible]}>
              {vencido ? 'Venció el ' : 'Vigente hasta el '}
              {fechaYHora(aviso.vigente_hasta)}
            </Text>
            {vencido ? <Insignia texto="Vencido" color={chipsPase.usado} /> : null}
            <Feather
              name={abierta ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colores.textoSecundario}
            />
          </View>
        </View>
      </View>

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
    ...sombras.tarjeta,
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  presionada: { opacity: 0.9 },
  fila: { flexDirection: 'row', gap: 12 },
  cuerpo: { flex: 1, gap: 4 },
  flexible: { flex: 1 },
  etiqueta: { ...tipografia.etiqueta, color: colores.principal },
  titulo: { ...tipografia.subtitulo, fontSize: 17, color: colores.texto },
  mensaje: { ...tipografia.cuerpo, lineHeight: 20, color: colores.textoSecundario },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  detalle: { ...tipografia.cuerpo, fontSize: 12, color: colores.textoSecundario },
  imagen: { width: '100%', aspectRatio: 16 / 9, borderRadius: radios.campo },
});

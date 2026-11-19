/**
 * Tarjeta P8 de un contacto de emergencia: datos persistidos y acciones identificadas por nombre.
 * La usa Perfil; recibe callbacks y no realiza llamadas al servidor. Respeta colores, radios y
 * áreas táctiles del tema. Llamar utiliza el teléfono del equipo, separado de las escrituras CRUD:
 * sigue disponible con datos visibles aunque falle una recarga. El número se puede seleccionar.
 */
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { abrirMarcador } from '@/lib/llamadas';
import { colores, radios, tamanos, tipografia } from '@/tema';
import type { ContactoEmergencia } from '@/tipos/contacto';
import { enlaceTelefono } from '@/utilidades/contactosEmergencia';

/** Datos persistidos y operaciones que coordina la pantalla mediante su hook. */
type Props = {
  contacto: ContactoEmergencia;
  deshabilitado: boolean;
  alEditar: () => void;
  alEliminar: () => void;
};

/** Presenta un contacto sin recortar su nombre, teléfono ni correo cuando crece el texto. */
export function TarjetaContacto({ contacto, deshabilitado, alEditar, alEliminar }: Props) {
  const [abriendo, setAbriendo] = useState(false);
  const [aviso, setAviso] = useState<{ telefono: string; texto: string } | null>(null);
  const solicitando = useRef(false);
  const enlace = enlaceTelefono(contacto.telefono);

  /** Evita abrir dos marcadores por doble toque e informa si el sistema rechaza la solicitud. */
  async function llamar() {
    if (solicitando.current || !enlace) return;
    solicitando.current = true;
    setAbriendo(true);
    setAviso(null);
    try {
      await abrirMarcador(contacto.telefono);
      setAviso({
        telefono: contacto.telefono,
        texto: 'Se solicitó abrir el marcador. Completa la llamada en la aplicación de teléfono.',
      });
    } catch (error) {
      setAviso({
        telefono: contacto.telefono,
        texto:
          error instanceof Error
            ? error.message
            : 'No se abrió el marcador. Puedes seleccionar y copiar el teléfono.',
      });
    } finally {
      solicitando.current = false;
      setAbriendo(false);
    }
  }

  // En web se entrega un enlace tel: real. El navegador no puede confirmar si hay un marcador:
  // no se simula una llamada exitosa y el número seleccionable sigue siendo la alternativa.
  const accionLlamar = (
    <Pressable
      accessibilityRole={Platform.OS === 'web' ? 'link' : 'button'}
      accessibilityLabel={`Llamar a ${contacto.nombre}`}
      accessibilityHint="Abre la aplicación de llamadas con el teléfono de este contacto."
      accessibilityState={{ disabled: !enlace || abriendo, busy: abriendo }}
      disabled={!enlace || abriendo}
      onPress={Platform.OS === 'web' ? undefined : llamar}
      // Link asChild de Expo Router 58 exige un objeto de estilos, no un arreglo.
      style={StyleSheet.flatten([estilos.llamar, (!enlace || abriendo) && estilos.inactivo])}
    >
      {abriendo ? (
        <ActivityIndicator color={colores.superficie} />
      ) : (
        <>
          <Feather name="phone-call" size={18} color={colores.superficie} />
          <Text style={estilos.textoLlamar}>Llamar</Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.encabezado}>
        <View style={estilos.icono}>
          <Feather name="phone" size={22} color={colores.principal} />
        </View>
        <View style={estilos.datos}>
          <Text style={estilos.nombre}>{contacto.nombre}</Text>
          {contacto.parentesco ? <Text style={estilos.detalle}>{contacto.parentesco}</Text> : null}
          <Text selectable style={estilos.telefono}>
            {contacto.telefono}
          </Text>
          {contacto.correo ? <Text style={estilos.detalle}>{contacto.correo}</Text> : null}
        </View>
      </View>
      {Platform.OS === 'web' && enlace ? (
        <Link href={enlace} asChild>
          {accionLlamar}
        </Link>
      ) : (
        accionLlamar
      )}
      {!enlace ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          Revisa el teléfono con Editar antes de llamar.
        </Text>
      ) : null}
      {Platform.OS === 'web' ? (
        <Text style={estilos.detalle}>
          Necesitas una aplicación de llamadas en este equipo. También puedes seleccionar y copiar
          el número.
        </Text>
      ) : null}
      {aviso?.telefono === contacto.telefono ? (
        <Text accessibilityLiveRegion="polite" role="status" style={estilos.detalle}>
          {aviso.texto}
        </Text>
      ) : null}
      <View style={estilos.acciones}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar contacto de ${contacto.nombre}`}
          accessibilityState={{ disabled: deshabilitado }}
          disabled={deshabilitado}
          onPress={alEditar}
          style={[estilos.accion, deshabilitado && estilos.inactivo]}
        >
          <Feather name="edit-2" size={16} color={colores.principal} />
          <Text style={estilos.editar}>Editar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar contacto de ${contacto.nombre}`}
          accessibilityState={{ disabled: deshabilitado }}
          disabled={deshabilitado}
          onPress={alEliminar}
          style={[estilos.accion, deshabilitado && estilos.inactivo]}
        >
          <Feather name="trash-2" size={16} color={colores.peligroTexto} />
          <Text style={estilos.eliminar}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  encabezado: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icono: {
    width: 44,
    height: 44,
    backgroundColor: colores.suave,
    borderRadius: radios.campo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: { flex: 1, gap: 4 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  telefono: { ...tipografia.cuerpo, color: colores.texto },
  llamar: {
    minHeight: tamanos.alturaBotonMin,
    backgroundColor: colores.principal,
    borderRadius: radios.boton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoLlamar: { ...tipografia.subtitulo, color: colores.superficie },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  acciones: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    paddingTop: 4,
  },
  accion: {
    flex: 1,
    minHeight: tamanos.areaTactilMinima,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editar: { ...tipografia.cuerpo, color: colores.principal },
  eliminar: { ...tipografia.cuerpo, color: colores.peligroTexto },
  inactivo: { opacity: 0.45 },
});

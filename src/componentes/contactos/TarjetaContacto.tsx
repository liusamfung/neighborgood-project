/**
 * Tarjeta P8: presenta un contacto y las acciones Llamar, Editar y Eliminar.
 * Perfil coordina las escrituras; esta tarjeta solo invoca callbacks y el servicio del teléfono.
 * Reutiliza Boton y el tema; el número es seleccionable si el dispositivo no tiene marcador.
 */
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { abrirMarcador } from '@/servicios/llamadas';
import { colores, radios, tipografia } from '@/tema';
import type { ContactoEmergencia } from '@/tipos/contacto';
import { enlaceTelefono } from '@/utilidades/contactosEmergencia';

/** Datos persistidos y acciones que la pantalla ejecuta mediante el hook de contactos. */
type Props = {
  contacto: ContactoEmergencia;
  deshabilitado: boolean;
  alEditar: () => void;
  alEliminar: () => void;
};

/** Muestra los datos sin truncarlos y evita abrir varios marcadores por doble toque. */
export function TarjetaContacto({ contacto, deshabilitado, alEditar, alEliminar }: Props) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const solicitando = useRef(false);

  /** Abre el marcador con el número validado; los fallos dejan el número disponible para copiar. */
  async function llamar() {
    if (solicitando.current) return;
    solicitando.current = true;
    setAbriendo(true);
    setError(null);
    try {
      await abrirMarcador(contacto.telefono);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se abrió el marcador.');
    } finally {
      solicitando.current = false;
      setAbriendo(false);
    }
  }

  return (
    <View style={estilos.tarjeta}>
      <Text accessibilityRole="header" style={estilos.nombre}>
        {contacto.nombre}
      </Text>
      {contacto.parentesco ? <Text style={estilos.detalle}>{contacto.parentesco}</Text> : null}
      <Text selectable style={estilos.telefono}>
        {contacto.telefono}
      </Text>
      {contacto.correo ? (
        <Text selectable style={estilos.detalle}>
          {contacto.correo}
        </Text>
      ) : null}
      <Boton
        texto="Llamar"
        alPresionar={llamar}
        cargando={abriendo}
        deshabilitado={!enlaceTelefono(contacto.telefono)}
      />
      <Text style={estilos.detalle}>Abre el marcador; tú decides si completas la llamada.</Text>
      {error ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      ) : null}
      <View style={estilos.acciones}>
        <View style={estilos.accion}>
          <Boton
            texto="Editar"
            variante="secundario"
            alPresionar={alEditar}
            deshabilitado={deshabilitado}
          />
        </View>
        <View style={estilos.accion}>
          <Boton
            texto="Eliminar"
            variante="secundario"
            alPresionar={alEliminar}
            deshabilitado={deshabilitado}
          />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    padding: 16,
    gap: 10,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  telefono: { ...tipografia.cuerpo, color: colores.texto },
  acciones: { flexDirection: 'row', gap: 12 },
  accion: { flex: 1 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

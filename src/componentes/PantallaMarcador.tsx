import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { useSesion } from '@/contexto/SesionContext';
import { colores, espacios, radios, tamanos, tipografia } from '@/tema';

type Props = {
  /** ID de la pantalla en docs/design/DISENO.md (P1, P2, ...). Vacío si no tiene mockup. */
  id?: string;
  titulo: string;
  /** Requisitos que implementa la pantalla (docs/requisitos/REQUISITOS.md). */
  requisitos?: string;
  /** Enlace de prueba para recorrer la navegación mientras no hay pantallas reales. */
  enlace?: { texto: string; href: Href };
};

/** Pantalla provisional: se reemplaza por la real en el Sprint que implementa sus requisitos. */
export function PantallaMarcador({ id, titulo, requisitos, enlace }: Props) {
  const { perfil, cerrarSesion } = useSesion();

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>
        {id ? `${id} · pantalla pendiente` : 'Pantalla pendiente (sin mockup)'}
      </Text>
      <Text style={estilos.titulo}>{titulo}</Text>
      {requisitos ? <Text style={estilos.detalle}>{requisitos}</Text> : null}
      {enlace ? (
        <Link href={enlace.href} style={estilos.boton}>
          {enlace.texto}
        </Link>
      ) : null}
      {/* Temporal: hasta que cada pantalla real tenga su propio perfil y salida. */}
      {perfil ? (
        <View style={estilos.sesion}>
          <Text style={estilos.detalle}>
            Sesión: {perfil.nombre} {perfil.apellido} · {perfil.rol}
          </Text>
          <Boton
            variante="secundario"
            texto="Cerrar sesión"
            alPresionar={() =>
              cerrarSesion().catch((error) => console.error('No se pudo cerrar la sesión', error))
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espacios.margenLateral,
    gap: espacios.entreTarjetas,
    backgroundColor: colores.fondo,
  },
  etiqueta: { ...tipografia.etiqueta, color: colores.principal },
  titulo: { ...tipografia.titulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  sesion: { marginTop: espacios.entreTarjetas, gap: espacios.entreTarjetas },
  boton: {
    ...tipografia.subtitulo,
    marginTop: espacios.entreTarjetas,
    minHeight: tamanos.alturaBoton,
    lineHeight: tamanos.alturaBoton,
    textAlign: 'center',
    color: colores.superficie,
    backgroundColor: colores.principal,
    borderRadius: radios.boton,
    overflow: 'hidden',
  },
});

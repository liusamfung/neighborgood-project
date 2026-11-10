/**
 * PantallaMarcador: pantalla provisional que ocupa el lugar de cada pantalla aún no construida.
 *
 * Qué hace: muestra el ID de la pantalla del mockup (P1, P2...), su título y los requisitos (RF) que
 * implementará, para poder recorrer la navegación por rol desde el Sprint 3. Si hay una sesión, muestra
 * el nombre y el rol del usuario y un botón "Cerrar sesión" (temporal). En desarrollo (`__DEV__`) añade
 * `ProbarFuncion`, la prueba temporal de las Edge Functions (issue #6).
 * Se usa con: casi todas las rutas de `src/app/**`, hasta que cada una se reemplace por la real.
 * Depende de: `Boton` (cerrar sesión), `ProbarFuncion`, `useSesion` (`src/contexto/SesionContext.tsx`) y `src/tema`.
 */
import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { ProbarFuncion } from '@/componentes/ProbarFuncion';
import { useSesion } from '@/contexto/SesionContext';
import { colores, espacios, radios, tamanos, tipografia } from '@/tema';

/** Datos que recibe cada pantalla provisional. */
type Props = {
  /** ID de la pantalla en docs/design/DISENO.md (P1, P2, ...). Vacío si no tiene mockup. */
  id?: string;
  /** Nombre de la pantalla, por ejemplo "Inicio". */
  titulo: string;
  /** Requisitos que implementa la pantalla (docs/requisitos/REQUISITOS.md). */
  requisitos?: string;
  /** Enlace de prueba para recorrer la navegación mientras no hay pantallas reales. */
  enlace?: { texto: string; href: Href };
};

/**
 * Pantalla provisional: se reemplaza por la real en el Sprint que implementa sus requisitos.
 * Muestra qué pantalla es, qué RF cubre y, si hay sesión, quién la inició con un botón para salir.
 */
export function PantallaMarcador({ id, titulo, requisitos, enlace }: Props) {
  // El perfil solo existe con sesión iniciada: en el login y el registro no se muestra el bloque de sesión.
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
          {/* Solo en desarrollo: no aparece en la versión Release. */}
          {__DEV__ ? <ProbarFuncion /> : null}
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

// Estilos con los tokens del tema (colores, espacios y tipografía); `boton` imita al botón primario
// porque `Link` no admite el componente `Boton`.
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

/**
 * Ruta `/directiva` (rol Directiva): pantalla P12 · Panel del mockup.
 * RF31: muestra GraficaIncidencias con hook/repositorio/vista SQL. RF28 conserva su alcance.
 * El contenido desplazable permite consultar doce meses con letra grande. Conserva la salida de sesión.
 */
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Boton } from '@/componentes/formulario/Boton';
import { GraficaIncidencias } from '@/componentes/incidencias/GraficaIncidencias';
import { useSesion } from '@/contexto/SesionContext';
import { colores, tipografia } from '@/tema';

/** Panel del rol directiva: lectura del reporte y controles de sesión. */
export default function Panel() {
  const { perfil, cerrarSesion } = useSesion();
  const [error, setError] = useState('');
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 48 }}
    >
      <Text style={tipografia.subtitulo}>Hola, {perfil?.nombre}</Text>
      <GraficaIncidencias />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Boton
        texto="Cerrar sesión"
        variante="secundario"
        alPresionar={() => {
          void cerrarSesion().catch(() =>
            setError('No pudimos cerrar la sesión. Intenta nuevamente.'),
          );
        }}
      />
    </ScrollView>
  );
}

/**
 * ProbarFuncion: botón TEMPORAL para comprobar que la app llega a una Edge Function desplegada.
 *
 * Qué hace: al tocarlo llama a `quienSoy()` y muestra el rol que el servidor reconoce para la sesión
 * actual, o el error en español. Es la evidencia del issue #6 (función desplegada que responde a la
 * app autenticada).
 * Se usa con: `src/componentes/PantallaMarcador.tsx`, que solo lo muestra en desarrollo (`__DEV__`).
 * Se retira cuando exista la primera pantalla real que use funciones (RF15). Depende de
 * `src/repositorios/funciones.ts` y de `Boton`.
 */
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { quienSoy } from '@/repositorios/funciones';
import { colores, tipografia } from '@/tema';

/** Botón "Probar Edge Function" con el resultado de la llamada debajo. */
export function ProbarFuncion() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  /** Llama a la función y guarda el texto que se muestra; el error ya llega traducido. */
  async function probar() {
    setCargando(true);
    setResultado(null);
    try {
      const respuesta = await quienSoy();
      setResultado(`El servidor dice que eres: ${respuesta.rol}`);
    } catch (error) {
      setResultado(error instanceof Error ? error.message : 'No pudimos completar la acción.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Boton
        variante="secundario"
        texto="Probar Edge Function"
        alPresionar={probar}
        cargando={cargando}
      />
      {resultado ? <Text style={estilos.resultado}>{resultado}</Text> : null}
    </>
  );
}

// Estilo del texto de resultado, con los tokens del tema.
const estilos = StyleSheet.create({
  resultado: { ...tipografia.cuerpo, color: colores.textoSecundario },
});

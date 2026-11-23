/**
 * Ruta `/directiva/encuestas/[id]/resultados` (rol Directiva): pantalla P14b · Resultados de la encuesta del mockup.
 * RF12: presenta agregados autorizados mediante ResultadosEncuesta.
 * El layout directiva registra esta ruta; la lista RF11 permite elegir una encuesta.
 */
import { useLocalSearchParams } from 'expo-router';
import { ResultadosEncuesta } from '@/componentes/encuestas/ResultadosEncuesta';

/** Reutiliza la pantalla de resultados con el rol real de la sesión. */
export default function Resultados() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ResultadosEncuesta id={id} />;
}

/** Ruta RF12 del residente: resultados compartidos, cuya disponibilidad autoriza la RPC. */
import { useLocalSearchParams } from 'expo-router';
import { ResultadosEncuesta } from '@/componentes/encuestas/ResultadosEncuesta';

/** Muestra resultados en vivo o reservados, sin identificar a quienes votaron. */
export default function Resultados() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ResultadosEncuesta id={id} />;
}

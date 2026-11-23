/** RF27: ruta protegida de detalle; delega la lectura y respuesta en DetalleAtencion. */
import { useLocalSearchParams } from 'expo-router';
import { DetalleAtencion } from '@/componentes/alertas/DetalleAtencion';
/** Comparte el detalle sin permitir al residente ejecutar acciones del personal. */
export default function Detalle() {
  const { id } = useLocalSearchParams();
  return <DetalleAtencion id={id} />;
}

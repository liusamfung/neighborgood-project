import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Encuestas() {
  return (
    <PantallaMarcador
      titulo="Encuestas"
      requisitos="RF8, RF11"
      enlace={{ texto: 'Crear encuesta', href: '/directiva/encuestas/nueva' }}
    />
  );
}

import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Avisos() {
  return (
    <PantallaMarcador
      titulo="Avisos publicados"
      requisitos="RF7, RF11"
      enlace={{ texto: 'Crear aviso', href: '/directiva/avisos/nuevo' }}
    />
  );
}

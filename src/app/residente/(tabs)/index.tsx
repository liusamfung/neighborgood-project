import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Inicio() {
  return (
    <PantallaMarcador
      id="P2"
      titulo="Inicio"
      requisitos="RF23"
      enlace={{ texto: 'Enviar alerta de emergencia', href: '/residente/alerta/tipo' }}
    />
  );
}

import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function AlertaEnviada() {
  return (
    <PantallaMarcador
      id="P3b"
      titulo="Alerta enviada"
      requisitos="RF23"
      enlace={{ texto: 'Volver al inicio', href: '/residente' }}
    />
  );
}

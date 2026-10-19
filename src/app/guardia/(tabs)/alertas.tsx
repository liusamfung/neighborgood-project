import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Alertas() {
  return (
    <PantallaMarcador
      id="P9"
      titulo="Alertas activas"
      requisitos="RF25, RF28"
      enlace={{ texto: 'Ver detalle de una alerta', href: '/guardia/alerta/ejemplo' }}
    />
  );
}

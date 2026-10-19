import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function TipoAlerta() {
  return (
    <PantallaMarcador
      id="P3"
      titulo="Elegir tipo de alerta y confirmar"
      requisitos="RF23 a RF25"
      enlace={{ texto: 'Confirmar alerta', href: '/residente/alerta/enviada' }}
    />
  );
}

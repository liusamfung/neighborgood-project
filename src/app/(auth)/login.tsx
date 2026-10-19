import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Login() {
  return (
    <PantallaMarcador
      id="P1"
      titulo="Login"
      requisitos="RF1, RF2, RF6"
      enlace={{ texto: 'Crear cuenta', href: '/registro' }}
    />
  );
}

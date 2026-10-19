import { Redirect, type Href } from 'expo-router';

import { useSesion } from '@/contexto/SesionContext';
import type { Rol } from '@/tipos/perfil';

const INICIO_POR_ROL: Record<Rol, Href> = {
  residente: '/residente',
  guardia: '/guardia/alertas',
  directiva: '/directiva',
};

/** Punto de entrada: envía a cada usuario a la pantalla de inicio de su rol. */
export default function Indice() {
  const { rol } = useSesion();
  return <Redirect href={rol ? INICIO_POR_ROL[rol] : '/login'} />;
}

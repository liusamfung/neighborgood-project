/**
 * Punto de entrada de la app (ruta `/`): redirige a cada usuario a la pantalla de inicio de su rol,
 * o al login si no tiene rol.
 * Se usa con: `useSesion` (`src/contexto/SesionContext.tsx`) y el tipo `Rol` (`src/tipos/perfil.ts`).
 */
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

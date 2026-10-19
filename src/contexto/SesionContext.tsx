import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { obtenerPerfil } from '@/repositorios/perfiles';
import { cerrarSesion, escucharSesion, obtenerSesion } from '@/repositorios/sesion';
import { ROLES, type Perfil, type Rol } from '@/tipos/perfil';

type ValorSesion = {
  sesion: Session | null;
  perfil: Perfil | null;
  /** null si no hay sesión, no hay perfil o el perfil está inactivo. */
  rol: Rol | null;
  /** true mientras se recupera la sesión guardada o se consulta el perfil. */
  cargando: boolean;
  errorPerfil: Error | null;
  cerrarSesion: () => Promise<void>;
};

const SesionContext = createContext<ValorSesion | null>(null);

// SOLO DESARROLLO: permite recorrer los tres roles sin Supabase. Se elimina cuando exista
// la migración de `perfiles` y el inicio de sesión real (Sprint 3). Expo reemplaza la
// variable al compilar y `__DEV__` es false en producción, así que no llega a la build final.
const rolDev: Rol | null = __DEV__
  ? (ROLES.find((r) => r === process.env.EXPO_PUBLIC_ROL_DEV) ?? null)
  : null;

const perfilDev: Perfil | null = rolDev && {
  id: 'dev',
  unidad_id: null,
  nombre: 'Desarrollo',
  apellido: rolDev,
  telefono: null,
  rol: rolDev,
  activo: true,
};

export function SesionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sesion, setSesion] = useState<Session | null>(null);
  const [recuperando, setRecuperando] = useState(true);

  useEffect(() => {
    let vigente = true;
    obtenerSesion()
      .then((s) => vigente && setSesion(s))
      .catch((error) => console.error('No se pudo recuperar la sesión', error))
      .finally(() => vigente && setRecuperando(false));
    const dejarDeEscuchar = escucharSesion((s) => {
      setSesion(s);
      setRecuperando(false);
    });
    return () => {
      vigente = false;
      dejarDeEscuchar();
    };
  }, []);

  const usuarioId = sesion?.user.id;
  const consulta = useQuery({
    queryKey: ['perfil', usuarioId],
    queryFn: () => obtenerPerfil(usuarioId as string),
    enabled: Boolean(usuarioId) && !perfilDev,
  });

  const perfil = perfilDev ?? consulta.data ?? null;

  const valor: ValorSesion = {
    sesion,
    perfil,
    rol: perfil?.activo ? perfil.rol : null,
    cargando: perfilDev ? false : recuperando || (Boolean(usuarioId) && consulta.isPending),
    errorPerfil: consulta.error,
    cerrarSesion: async () => {
      await cerrarSesion();
      queryClient.removeQueries({ queryKey: ['perfil'] });
    },
  };

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return valor;
}

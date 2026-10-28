import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { obtenerPerfil } from '@/repositorios/perfiles';
import { cerrarSesion, escucharSesion, obtenerSesion } from '@/repositorios/sesion';
import type { Perfil, Rol } from '@/tipos/perfil';

type ValorSesion = {
  sesion: Session | null;
  perfil: Perfil | null;
  /** null si no hay sesión, no hay perfil o el perfil está inactivo. */
  rol: Rol | null;
  /** true mientras se recupera la sesión guardada o se consulta el perfil. */
  cargando: boolean;
  errorPerfil: Error | null;
  /** Por qué la app sacó al usuario tras iniciar sesión (sin perfil, inactivo o error). */
  rechazo: string | null;
  limpiarRechazo: () => void;
  cerrarSesion: () => Promise<void>;
};

const SesionContext = createContext<ValorSesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sesion, setSesion] = useState<Session | null>(null);
  const [recuperando, setRecuperando] = useState(true);
  const [rechazo, setRechazo] = useState<string | null>(null);

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
    enabled: Boolean(usuarioId),
  });

  const perfil = consulta.data ?? null;
  const rol = perfil?.activo ? perfil.rol : null;
  const cargando = recuperando || (Boolean(usuarioId) && consulta.isPending);

  const cerrar = async () => {
    await cerrarSesion();
    queryClient.removeQueries({ queryKey: ['perfil'] });
  };

  // Una sesión sin perfil activo no puede ver nada (RLS): se cierra y se explica el motivo.
  // El mensaje vive aquí y no en la pantalla de login porque, mientras se carga el perfil,
  // la navegación desmonta el login y un estado local se perdería. Se fija durante el render
  // (patrón de React para ajustar el estado según otro valor) para que ya esté puesto cuando
  // el login vuelva a montarse.
  const sinAcceso = !cargando && Boolean(sesion) && rol === null;
  const motivo = consulta.isError
    ? 'No pudimos cargar tu perfil. Inténtalo de nuevo.'
    : perfil
      ? 'Tu cuenta está desactivada. Contacta a la directiva.'
      : 'Tu correo no está habilitado. Contacta a la directiva.';
  if (sinAcceso && rechazo !== motivo) setRechazo(motivo);

  useEffect(() => {
    if (!sinAcceso) return;
    cerrar().catch((error) => console.error('No se pudo cerrar la sesión', error));
    // `cerrar` solo debe ejecutarse al detectar la sesión sin acceso, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinAcceso]);

  const valor: ValorSesion = {
    sesion,
    perfil,
    rol,
    cargando,
    errorPerfil: consulta.error,
    rechazo,
    limpiarRechazo: () => setRechazo(null),
    cerrarSesion: cerrar,
  };

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return valor;
}

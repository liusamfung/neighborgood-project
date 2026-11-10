/**
 * Contexto de sesión y rol: la fuente única de "quién está usando la app".
 *
 * Qué hace: recupera la sesión de Supabase, carga el perfil del usuario y expone su rol. Si el usuario
 * inicia sesión pero no tiene perfil activo (correo no habilitado, cuenta desactivada o error), cierra
 * la sesión y deja el motivo en `rechazo` para que el login lo muestre (RF1, RF3).
 * Se usa con: `src/app/_layout.tsx` (monta el proveedor y decide la navegación por rol),
 * `src/app/index.tsx`, `src/app/(auth)/login.tsx` y `src/componentes/PantallaMarcador.tsx` (`useSesion`).
 * Depende de: `src/repositorios/sesion.ts`, `src/repositorios/perfiles.ts` y TanStack Query.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { obtenerPerfil } from '@/repositorios/perfiles';
import { cerrarSesion, escucharSesion, obtenerSesion } from '@/repositorios/sesion';
import type { Perfil, Rol } from '@/tipos/perfil';

/** Lo que entrega `useSesion()` a cualquier pantalla. */
type ValorSesion = {
  /** Sesión de Supabase Auth (con el token); `null` si no se inició sesión. */
  sesion: Session | null;
  /** Fila de `perfiles` del usuario; `null` si no hay sesión o no tiene perfil. */
  perfil: Perfil | null;
  /** null si no hay sesión, no hay perfil o el perfil está inactivo. */
  rol: Rol | null;
  /** true mientras se recupera la sesión guardada o se consulta el perfil. */
  cargando: boolean;
  /** Error de la consulta del perfil, si falló (por ejemplo, sin conexión). */
  errorPerfil: Error | null;
  /** Por qué la app sacó al usuario tras iniciar sesión (sin perfil, inactivo o error). */
  rechazo: string | null;
  /** Borra el mensaje de rechazo (el login lo llama al volver a intentar). */
  limpiarRechazo: () => void;
  /** Cierra la sesión y limpia el perfil guardado en caché. */
  cerrarSesion: () => Promise<void>;
};

// Contexto de React; su valor lo fija `SesionProvider` y se lee con `useSesion()`.
const SesionContext = createContext<ValorSesion | null>(null);

/**
 * Proveedor de la sesión: se monta una sola vez en `src/app/_layout.tsx`, dentro del proveedor de
 * TanStack Query. Recupera la sesión guardada, carga el perfil del usuario y calcula su rol.
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sesion, setSesion] = useState<Session | null>(null);
  const [recuperando, setRecuperando] = useState(true);
  const [rechazo, setRechazo] = useState<string | null>(null);

  // Al montar: recupera la sesión guardada y se suscribe a sus cambios (inicio y cierre de sesión).
  // `vigente` evita actualizar el estado si el componente ya se desmontó.
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

  // El perfil se consulta solo cuando hay sesión; TanStack Query lo guarda en caché por usuario.
  const usuarioId = sesion?.user.id;
  const consulta = useQuery({
    queryKey: ['perfil', usuarioId],
    queryFn: () => obtenerPerfil(usuarioId as string),
    enabled: Boolean(usuarioId),
  });

  // El rol solo vale si el perfil está activo (la base también lo exige en las políticas RLS).
  const perfil = consulta.data ?? null;
  const rol = perfil?.activo ? perfil.rol : null;
  const cargando = recuperando || (Boolean(usuarioId) && consulta.isPending);

  // Cierra la sesión y borra el perfil de la caché para que el siguiente usuario no vea el anterior.
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

  // Valor que reciben las pantallas; la navegación de `src/app/_layout.tsx` decide con `rol` y `cargando`.
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

/**
 * Hook para leer la sesión, el perfil y el rol desde cualquier pantalla.
 * Lanza un error si se usa fuera de `SesionProvider`.
 */
export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return valor;
}

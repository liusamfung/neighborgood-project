/**
 * Hook que registra este teléfono para recibir push mientras haya una sesión con perfil activo (issue #7).
 *
 * Qué hace: cuando el usuario inicia sesión (y tiene un perfil activo) pide el permiso de notificaciones,
 * obtiene el token de Expo Push de este teléfono y lo guarda en `dispositivos` con `registrar_dispositivo`.
 * Si el sistema cambia el token (por ejemplo, tras restaurar el teléfono), lo vuelve a registrar.
 * Cómo funciona: se monta una sola vez, en `src/app/_layout.tsx`, y se vuelve a ejecutar solo si cambia el
 * usuario. Es de mejor esfuerzo: si el permiso se niega, el teléfono no tiene push remoto (iPhone con cuenta
 * de Apple gratuita) o falla la red, solo avisa en la consola y la app sigue igual. Al cerrar sesión el
 * token se quita en `SesionContext` (`quitarDispositivoDeEsteTelefono`), no aquí.
 * Se usa con: `src/app/_layout.tsx`.
 * Depende de: `src/contexto/SesionContext.tsx`, `src/servicios/notificaciones.ts` (permiso y token) y
 * `src/repositorios/dispositivos.ts` (guarda el token en Supabase).
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useSesion } from '@/contexto/SesionContext';
import { registrarDispositivo } from '@/repositorios/dispositivos';
import { escucharCambioDeToken, obtenerTokenPush } from '@/servicios/notificaciones';

/** Registra el teléfono para recibir push mientras haya un usuario activo con sesión. */
export function useRegistroDeDispositivo() {
  const { perfil } = useSesion();
  // Solo un perfil activo puede registrar su teléfono (la función SQL también lo exige).
  const usuarioId = perfil?.activo ? perfil.id : null;

  useEffect(() => {
    if (!usuarioId || Platform.OS === 'web') return;
    // `vigente` evita seguir si el usuario cerró sesión o la pantalla se desmontó mientras se esperaba.
    let vigente = true;

    /** Obtiene el token y lo guarda; cualquier fallo solo se avisa en la consola. */
    async function registrar() {
      const token = await obtenerTokenPush();
      if (!token || !vigente) return;
      try {
        await registrarDispositivo(token, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch (error) {
        console.warn('No se pudo registrar el teléfono para las notificaciones', error);
      }
    }

    void registrar();
    const dejarDeEscuchar = escucharCambioDeToken(() => void registrar());
    return () => {
      vigente = false;
      dejarDeEscuchar();
    };
  }, [usuarioId]);
}

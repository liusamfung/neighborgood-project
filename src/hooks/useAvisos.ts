/**
 * Hooks de TanStack Query para leer avisos (RF10, RF11).
 *
 * Qué hace: entrega la lista de avisos visibles para el usuario y la URL temporal de la imagen de un
 * aviso. La clave `['avisos']` es la misma que invalida `useCrearAviso`, así que al publicar un aviso
 * la lista se refresca sola.
 * Se usa con: `src/app/residente/(tabs)/avisos.tsx`, `src/app/directiva/(tabs)/avisos.tsx` y
 * `src/componentes/avisos/TarjetaAviso.tsx`.
 * Depende de: `src/repositorios/avisos.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useQuery } from '@tanstack/react-query';

import { listarAvisos, urlImagenAviso } from '@/repositorios/avisos';

/** Avisos que RLS deja ver al usuario, del más reciente al más antiguo. */
export function useAvisos() {
  return useQuery({ queryKey: ['avisos'], queryFn: listarAvisos });
}

/**
 * URL firmada de la imagen de un aviso.
 *
 * @param imagenPath ruta en Storage; con `null` o con `activo` en false no se consulta.
 * @param activo se pone en true cuando la tarjeta se abre, para no pedir URLs de avisos cerrados.
 */
export function useImagenAviso(imagenPath: string | null, activo: boolean) {
  return useQuery({
    queryKey: ['avisos', 'imagen', imagenPath],
    queryFn: () => urlImagenAviso(imagenPath as string),
    enabled: activo && Boolean(imagenPath),
    // La URL firmada vale 60 minutos: se reutiliza 50 y luego se pide otra.
    staleTime: 50 * 60 * 1000,
  });
}

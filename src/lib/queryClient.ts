/**
 * Cliente de TanStack Query de toda la app.
 *
 * Qué hace: crea el único `QueryClient`, que guarda en caché las consultas a Supabase y fija sus
 * valores por defecto (datos frescos 30 s, un reintento si una consulta falla).
 * Cómo funciona: conecta el estado de la app (primer plano o segundo plano) con el "foco" de
 * TanStack Query, para que vuelva a consultar al regresar a la app.
 * Se usa con: `src/app/_layout.tsx` (lo entrega con `QueryClientProvider`) y
 * `src/contexto/SesionContext.tsx` (usa `useQuery` para cargar el perfil).
 */
import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

/** Caché de consultas compartida por toda la app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // durante 30 s los datos se consideran frescos y no se vuelven a pedir
      retry: 1, // una consulta fallida se reintenta una sola vez antes de mostrar el error
    },
  },
});

// En móvil no existe el foco de ventana: se usa el estado de la app para volver a consultar.
AppState.addEventListener('change', (estado) => {
  focusManager.setFocused(estado === 'active');
});

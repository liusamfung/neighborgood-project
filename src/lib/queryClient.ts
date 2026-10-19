import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// En móvil no existe el foco de ventana: se usa el estado de la app para volver a consultar.
AppState.addEventListener('change', (estado) => {
  focusManager.setFocused(estado === 'active');
});

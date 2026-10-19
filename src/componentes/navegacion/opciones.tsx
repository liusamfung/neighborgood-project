import { Feather } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colores, fuentes, tamanos } from '@/tema';

type OpcionesPestanas = NonNullable<ComponentProps<typeof Tabs>['screenOptions']>;

/** Barra inferior común a los tres roles (DISENO.md: ícono + texto, pestaña activa en teal). */
export const opcionesPestanas: OpcionesPestanas = {
  headerShown: false,
  tabBarActiveTintColor: colores.principal,
  tabBarInactiveTintColor: colores.textoSecundario,
  tabBarLabelStyle: { fontFamily: fuentes.semibold, fontSize: 12 },
  tabBarItemStyle: { minHeight: tamanos.areaTactilMinima },
  tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.borde },
};

/** Opciones de una pestaña: título e ícono Feather. */
export function pestana(title: string, icono: ComponentProps<typeof Feather>['name']) {
  return {
    title,
    tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
      <Feather name={icono} color={typeof color === 'string' ? color : undefined} size={size} />
    ),
  };
}

/** Pantallas apiladas (detalles y formularios): barra superior con flecha de volver. */
export const opcionesPila = {
  headerTintColor: colores.principal,
  headerTitleStyle: { fontFamily: fuentes.semibold, color: colores.texto },
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: { backgroundColor: colores.superficie },
  contentStyle: { backgroundColor: colores.fondo },
} as const;

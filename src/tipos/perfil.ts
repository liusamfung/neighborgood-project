export type Rol = 'directiva' | 'residente' | 'guardia';

export const ROLES: readonly Rol[] = ['directiva', 'residente', 'guardia'];

/** Fila de la tabla `perfiles` (docs/db_diagram). */
export type Perfil = {
  id: string;
  /** NULL para directiva y guardia; un residente siempre tiene unidad. */
  unidad_id: string | null;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rol: Rol;
  activo: boolean;
};

/** Tipos comunes de RF11; repositorio, hook y lista comparten filtros y filas sin exponer autores. */
export type TipoPublicacion = 'avisos' | 'encuestas';
export type PeriodoHistorial = 'todos' | 'vigentes' | 'anteriores';
export type PublicacionHistorial = {
  id: string;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  categoria: { id: string; nombre: string } | null;
};

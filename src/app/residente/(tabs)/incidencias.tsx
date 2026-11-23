/** RF30: ruta protegida de incidencias; ListaIncidencias comparte gestión y seguimiento por rol. */
import { ListaIncidencias } from '@/componentes/incidencias/ListaIncidencias';
/** Delega consultas, filtros y cambio de estado al componente y a su hook. */
export default function Incidencias() {
  return <ListaIncidencias />;
}

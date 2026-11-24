/** RF31/P12: barras accesibles de conteos mensuales, usando hook y tema existentes.
 * Las cantidades/textos provienen de la vista SQL; no necesita librería gráfica nueva.
 * Muestra primero el mes actual y debajo los anteriores, para que la directiva vea lo más reciente sin
 * desplazarse. El hook entrega los meses del más antiguo al más nuevo (la consulta usa ese rango), así que
 * aquí solo se invierte el orden para mostrarlos.
 * Se usa con: el Panel de la directiva (`src/app/directiva/(tabs)/index.tsx`).
 * Depende de: `src/hooks/useReporteMensual.ts` y `src/utilidades/reporteMensual.ts`.
 */
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Boton } from '@/componentes/formulario/Boton';
import { ChipsSeleccion } from '@/componentes/formulario/ChipsSeleccion';
import { useReporteMensual } from '@/hooks/useReporteMensual';
import { etiquetaMes } from '@/utilidades/reporteMensual';
import { colores, tipografia } from '@/tema';

/** Meses sin filas muestran cero; un error oculta el reporte cacheado hasta recuperarlo. */
export function GraficaIncidencias() {
  const [rango, setRango] = useState<6 | 12>(6);
  const consulta = useReporteMensual(rango);
  // Copia invertida: `reverse()` cambia el arreglo original, que es la caché de TanStack Query.
  const datos = [...(consulta.data ?? [])].reverse();
  const maximo = Math.max(1, ...datos.map((d) => d.total));
  const total = datos.reduce((s, d) => s + d.total, 0);
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" style={tipografia.titulo}>
        Incidencias por mes
      </Text>
      <Text>
        Conteo por mes de creación en Lima. Los estados corresponden a la situación actual de esos
        reportes.
      </Text>
      <ChipsSeleccion
        etiqueta="Periodo"
        opciones={[
          { id: '6', texto: '6 meses' },
          { id: '12', texto: '12 meses' },
        ]}
        seleccionados={[String(rango)]}
        alCambiar={([v]) => setRango(v === '12' ? 12 : 6)}
      />
      {consulta.isPending ? (
        <ActivityIndicator accessibilityLabel="Cargando reporte mensual" />
      ) : consulta.isError ? (
        <Text accessibilityRole="alert">
          No pudimos recuperar el reporte. Revisa tu conexión y los permisos de tu cuenta.
        </Text>
      ) : (
        <>
          <Text accessibilityLiveRegion="polite" style={tipografia.subtitulo}>
            Total del periodo: {total}
          </Text>
          {!total ? <Text>No hay incidencias registradas en este periodo.</Text> : null}
          {datos.map((d) => (
            <View
              key={d.mes}
              accessible
              accessibilityLabel={`${etiquetaMes(d.mes)}: ${d.total} incidencias; ${d.pendientes} pendientes, ${d.enAtencion} en atención, ${d.resueltas} resueltas.`}
              style={{ gap: 6 }}
            >
              <Text style={tipografia.subtitulo}>
                {etiquetaMes(d.mes)} · {d.total}
              </Text>
              <View
                style={{
                  height: 18,
                  backgroundColor: colores.borde,
                  borderRadius: 9,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 18,
                    width: `${(d.total / maximo) * 100}%`,
                    backgroundColor: colores.principal,
                    borderRadius: 9,
                  }}
                />
              </View>
              <Text>
                Pendientes: {d.pendientes} · En atención: {d.enAtencion} · Resueltas: {d.resueltas}
              </Text>
            </View>
          ))}
        </>
      )}
      <Boton
        texto={consulta.isError ? 'Reintentar reporte' : 'Actualizar reporte'}
        variante="secundario"
        cargando={consulta.isFetching}
        alPresionar={() => {
          void consulta.refetch();
        }}
      />
    </View>
  );
}

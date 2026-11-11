/**
 * Ruta `/directiva/residentes` (rol Directiva): Residentes (sin mockup, ver docs/design/DISENO.md).
 * Implementa RF5: alta y baja de residentes.
 *
 * Qué hace: muestra dos listas. "Altas pendientes" son los correos que la directiva habilitó y que
 * todavía no crearon su cuenta (se puede quitar el alta). "Residentes registrados" son los perfiles con
 * rol residente (se puede dar de baja: el perfil queda con `activo = false`). El botón de arriba abre
 * el formulario de alta (`/directiva/residentes/nuevo`).
 * Cómo funciona: lee y escribe con los hooks de TanStack Query; cada acción pide confirmación con
 * `confirmar` (`src/utilidades/confirmar.ts`) y, al terminar, las listas se refrescan solas.
 * Se usa con: `src/hooks/useResidentes.ts`, `src/repositorios/residentes.ts` (tipos y mensajes de
 * error), `Boton`, el tema (`src/tema`) y `directiva/_layout.tsx`, que registra la ruta. Se llega desde
 * el Panel (`directiva/(tabs)/index.tsx`).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import {
  useAltasPendientes,
  useDarDeBaja,
  useQuitarAlta,
  useResidentesRegistrados,
} from '@/hooks/useResidentes';
import {
  mensajeDeErrorResidentes,
  type AltaPendiente,
  type ResidenteRegistrado,
} from '@/repositorios/residentes';
import { confirmar } from '@/utilidades/confirmar';
import { colores, chipsPase, espacios, radios, tamanos, tipografia } from '@/tema';

/** Texto de la unidad con su sector, por ejemplo "Torre A · Dpto 302". */
function textoUnidad(unidad: { codigo: string; sectores: { nombre: string } } | null): string {
  return unidad ? `${unidad.sectores.nombre} · ${unidad.codigo}` : 'Sin unidad';
}

/** Botón de texto para la acción de una fila (quitar alta o dar de baja), en color de peligro. */
function AccionFila({ texto, alPresionar }: { texto: string; alPresionar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alPresionar}
      style={({ pressed }) => [estilos.accion, pressed && estilos.presionado]}
    >
      <Text style={estilos.textoAccion}>{texto}</Text>
    </Pressable>
  );
}

/** Lista de residentes de la directiva: altas pendientes y residentes registrados (RF5). */
export default function Residentes() {
  const router = useRouter();
  const pendientes = useAltasPendientes();
  const registrados = useResidentesRegistrados();
  const quitarAlta = useQuitarAlta();
  const darDeBaja = useDarDeBaja();
  // Error de la última acción (quitar alta o dar de baja); los de carga se muestran aparte.
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargando = pendientes.isPending || registrados.isPending;
  const errorCarga = pendientes.isError || registrados.isError;
  const refrescando = pendientes.isRefetching || registrados.isRefetching;

  /** Vuelve a pedir las dos listas (gesto de deslizar hacia abajo y botón "Reintentar"). */
  function recargar() {
    pendientes.refetch();
    registrados.refetch();
  }

  /** Pide confirmación y quita un alta pendiente: ese correo ya no podrá registrarse. */
  function confirmarQuitarAlta(alta: AltaPendiente) {
    confirmar('Quitar alta', `${alta.correo} ya no podrá crear su cuenta.`, 'Quitar alta', () => {
      setErrorAccion(null);
      quitarAlta.mutate(alta.id, { onError: (e) => setErrorAccion(mensajeDeErrorResidentes(e)) });
    });
  }

  /** Pide confirmación y da de baja a un residente: su perfil queda con `activo = false`. */
  function confirmarBaja(residente: ResidenteRegistrado) {
    confirmar(
      'Dar de baja',
      `${residente.nombre} ${residente.apellido} ya no podrá entrar a la app.`,
      'Dar de baja',
      () => {
        setErrorAccion(null);
        darDeBaja.mutate(residente.id, {
          onError: (e) => setErrorAccion(mensajeDeErrorResidentes(e)),
        });
      },
    );
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} />}
    >
      <Boton
        texto="Dar de alta un residente"
        alPresionar={() => router.push('/directiva/residentes/nuevo')}
      />

      {errorAccion ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {errorAccion}
        </Text>
      ) : null}

      {cargando ? (
        <ActivityIndicator color={colores.principal} style={estilos.indicador} />
      ) : errorCarga ? (
        <View style={estilos.seccion}>
          <Text accessibilityRole="alert" style={estilos.error}>
            No pudimos cargar los residentes. Revisa tu conexión.
          </Text>
          <Boton variante="secundario" texto="Reintentar" alPresionar={recargar} />
        </View>
      ) : (
        <>
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Altas pendientes</Text>
            <Text style={estilos.detalle}>Correos habilitados que aún no crean su cuenta.</Text>
            {pendientes.data.length === 0 ? (
              <Text style={estilos.vacio}>No hay altas pendientes.</Text>
            ) : (
              pendientes.data.map((alta) => (
                <View key={alta.id} style={estilos.tarjeta}>
                  <Text style={estilos.nombre}>{alta.nombre}</Text>
                  <Text style={estilos.detalle}>{alta.correo}</Text>
                  <Text style={estilos.detalle}>{textoUnidad(alta.unidades)}</Text>
                  <AccionFila texto="Quitar alta" alPresionar={() => confirmarQuitarAlta(alta)} />
                </View>
              ))
            )}
          </View>

          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Residentes registrados</Text>
            {registrados.data.length === 0 ? (
              <Text style={estilos.vacio}>Todavía no hay residentes registrados.</Text>
            ) : (
              registrados.data.map((residente) => (
                <View key={residente.id} style={estilos.tarjeta}>
                  <View style={estilos.filaNombre}>
                    <Text style={[estilos.nombre, estilos.flexible]}>
                      {residente.nombre} {residente.apellido}
                    </Text>
                    {/* Los colores del chip reutilizan los del pase: verde (activo) y rojo (baja). */}
                    <View
                      style={[
                        estilos.chip,
                        {
                          backgroundColor: residente.activo
                            ? chipsPase.vigente.fondo
                            : chipsPase.anulado.fondo,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoChip,
                          {
                            color: residente.activo
                              ? chipsPase.vigente.texto
                              : chipsPase.anulado.texto,
                          },
                        ]}
                      >
                        {residente.activo ? 'Activo' : 'De baja'}
                      </Text>
                    </View>
                  </View>
                  <Text style={estilos.detalle}>{textoUnidad(residente.unidades)}</Text>
                  {/* Un residente dado de baja ya no tiene acción: RF5 no incluye reactivarlo. */}
                  {residente.activo ? (
                    <AccionFila texto="Dar de baja" alPresionar={() => confirmarBaja(residente)} />
                  ) : null}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Estilos con los tokens del tema: tarjetas blancas de radio 16 sobre el fondo gris de la app.
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 24 },
  indicador: { marginTop: 32 },
  seccion: { gap: espacios.entreTarjetas },
  tituloSeccion: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  tarjeta: {
    padding: 16,
    gap: 4,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexible: { flex: 1 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  vacio: { ...tipografia.cuerpo, color: colores.textoSecundario, paddingVertical: 8 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radios.chip },
  textoChip: { ...tipografia.etiqueta },
  // La acción ocupa al menos 44 px de alto para cumplir el área táctil mínima (RNF8).
  accion: {
    alignSelf: 'flex-start',
    minHeight: tamanos.areaTactilMinima,
    justifyContent: 'center',
  },
  textoAccion: { ...tipografia.subtitulo, color: colores.peligroTexto },
  presionado: { opacity: 0.6 },
});

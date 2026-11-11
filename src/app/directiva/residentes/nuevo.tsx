/**
 * Ruta `/directiva/residentes/nuevo` (rol Directiva): Dar de alta un residente (sin mockup). RF5.
 *
 * Qué hace: pide el nombre completo, el correo y la unidad del residente y lo guarda en
 * `residentes_habilitados`. Desde ese momento ese correo puede crear su cuenta (RF1) y el trigger de la
 * base le crea el perfil con ese nombre y esa unidad.
 * Cómo funciona: la unidad se elige de la lista de unidades habilitadas, filtrada por lo que se escribe
 * (sector o código). Al guardar aparece la franja de confirmación y la pantalla vuelve a la lista de
 * residentes, que se refresca sola: el formulario se descarta y no se puede enviar dos veces.
 * Se usa con: `src/hooks/useResidentes.ts` (`useUnidades`, `useDarDeAlta`),
 * `src/repositorios/residentes.ts` (mensajes de error), `useSesion` (quién hace el alta), `Boton`,
 * `CampoTexto`, el tema y `directiva/_layout.tsx`, que registra la ruta.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { useMensaje } from '@/contexto/MensajeContext';
import { useSesion } from '@/contexto/SesionContext';
import { useDarDeAlta, useUnidades } from '@/hooks/useResidentes';
import { mensajeDeErrorResidentes, type UnidadConSector } from '@/repositorios/residentes';
import { colores, espacios, radios, tamanos, tipografia } from '@/tema';
import { volverA } from '@/utilidades/navegacion';

// Comprobación sencilla de formato (algo@algo.algo), igual que en el registro.
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cuántas unidades se muestran a la vez; con más resultados se pide escribir para filtrar.
const MAXIMO_UNIDADES_VISIBLES = 8;

/** Texto de una unidad con su sector, por ejemplo "Torre A · Dpto 302". */
function textoUnidad(unidad: UnidadConSector): string {
  return `${unidad.sectores.nombre} · ${unidad.codigo}`;
}

/** Formulario de alta de un residente (RF5): nombre, correo y unidad. */
export default function NuevoResidente() {
  const router = useRouter();
  const { perfil } = useSesion();
  const unidades = useUnidades();
  const alta = useDarDeAlta();
  const { mostrarMensaje } = useMensaje();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [unidad, setUnidad] = useState<UnidadConSector | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Unidades cuyo sector o código contiene lo escrito (sin distinguir mayúsculas).
  const filtro = busqueda.trim().toLowerCase();
  const coincidencias = (unidades.data ?? []).filter((u) =>
    textoUnidad(u).toLowerCase().includes(filtro),
  );

  /** Valida el formulario y guarda el alta; si sale bien, vuelve a la lista de residentes. */
  function guardar() {
    setError(null);
    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    // El trigger de registro divide el nombre en nombre y apellido: se piden al menos dos palabras.
    if (nombreLimpio.split(/\s+/).length < 2) {
      setError('Escribe el nombre y el apellido del residente.');
      return;
    }
    if (!FORMATO_CORREO.test(correoLimpio)) {
      setError('Escribe un correo válido.');
      return;
    }
    if (!unidad) {
      setError('Elige la unidad del residente.');
      return;
    }
    // La pantalla solo se abre con sesión de directiva, pero el tipo de `perfil` admite null.
    if (!perfil) return;
    alta.mutate(
      { nombre: nombreLimpio, correo: correoLimpio, unidadId: unidad.id, creadoPor: perfil.id },
      {
        // La franja confirma y la pantalla vuelve a la lista: el formulario se descarta.
        onSuccess: () => {
          mostrarMensaje(`✅ ${nombreLimpio} ya puede crear su cuenta con ${correoLimpio}`);
          volverA(router, '/directiva/residentes');
        },
        onError: (e) => setError(mensajeDeErrorResidentes(e)),
      },
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.pantalla}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <CampoTexto
          etiqueta="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          returnKeyType="next"
        />

        <View style={estilos.grupo}>
          {unidad ? (
            // Unidad ya elegida: se muestra con la opción de cambiarla.
            <>
              <Text style={estilos.etiqueta}>Unidad</Text>
              <View style={[estilos.opcion, estilos.opcionElegida]}>
                <Text style={[estilos.textoOpcion, estilos.flexible]}>{textoUnidad(unidad)}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setUnidad(null)}
                  style={estilos.cambiar}
                >
                  <Text style={estilos.textoCambiar}>Cambiar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <CampoTexto
                etiqueta="Unidad"
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Busca por sector o código"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {unidades.isPending ? (
                <ActivityIndicator color={colores.principal} />
              ) : unidades.isError ? (
                <View style={estilos.grupo}>
                  <Text accessibilityRole="alert" style={estilos.error}>
                    No pudimos cargar las unidades.
                  </Text>
                  <Boton
                    variante="secundario"
                    texto="Reintentar"
                    alPresionar={() => unidades.refetch()}
                  />
                </View>
              ) : coincidencias.length === 0 ? (
                <Text style={estilos.detalle}>Ninguna unidad coincide con la búsqueda.</Text>
              ) : (
                <>
                  {coincidencias.slice(0, MAXIMO_UNIDADES_VISIBLES).map((u) => (
                    <Pressable
                      key={u.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setUnidad(u);
                        setBusqueda('');
                      }}
                      style={({ pressed }) => [estilos.opcion, pressed && estilos.presionado]}
                    >
                      <Text style={estilos.textoOpcion}>{textoUnidad(u)}</Text>
                    </Pressable>
                  ))}
                  {coincidencias.length > MAXIMO_UNIDADES_VISIBLES ? (
                    <Text style={estilos.detalle}>
                      Hay {coincidencias.length - MAXIMO_UNIDADES_VISIBLES} unidades más: escribe
                      para filtrar.
                    </Text>
                  ) : null}
                </>
              )}
            </>
          )}
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={estilos.error}>
            {error}
          </Text>
        ) : null}

        {/* Tras guardar, el botón sigue bloqueado mientras la pantalla se cierra. */}
        <Boton
          icono="user-plus"
          texto="Dar de alta"
          alPresionar={guardar}
          cargando={alta.isPending || alta.isSuccess}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Estilos con los tokens del tema; las opciones de unidad miden lo mismo que un campo de texto.
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.margenLateral, gap: 16 },
  grupo: { gap: 8 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  opcion: {
    minHeight: tamanos.alturaBotonMin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.campo,
  },
  opcionElegida: { borderColor: colores.principal, backgroundColor: colores.suave },
  textoOpcion: { ...tipografia.subtitulo, color: colores.texto },
  flexible: { flex: 1 },
  cambiar: { minHeight: tamanos.areaTactilMinima, justifyContent: 'center', paddingLeft: 12 },
  textoCambiar: { ...tipografia.subtitulo, color: colores.principal },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  presionado: { opacity: 0.6 },
});

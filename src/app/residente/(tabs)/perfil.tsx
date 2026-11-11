/**
 * Ruta `/residente/perfil` (rol Residente): pantalla P8 · Perfil y contactos de emergencia. RF4.
 *
 * Qué hace: muestra los datos del residente (nombre, unidad y correo), sus contactos de emergencia con
 * el contador "2 de 3", el formulario para agregar o editar un contacto (nombre, teléfono, relación y
 * correo opcional) y el botón para cerrar sesión.
 * Cómo funciona: sigue el mockup P8 y la corrección 6 de docs/design/DISENO.md: máximo 3 contactos; al
 * llegar a 3 el botón "Agregar contacto" se oculta y se explica que hay que borrar uno antes de agregar
 * otro (diagrama 1.3). El formulario se abre en la misma pantalla; al guardar o borrar se cierra y
 * aparece la franja de confirmación.
 * Se usa con: `src/hooks/useContactos.ts`, `src/hooks/useResidentes.ts` (`useUnidad`),
 * `src/repositorios/contactos.ts` (tipos y mensajes), `useSesion` (perfil, correo y cerrar sesión),
 * `useMensaje`, los componentes `Avatar`, `IconoCuadro`, `EstadoVacio`, `Boton` y `CampoTexto`,
 * `confirmar` y el tema.
 */
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/componentes/Avatar';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { IconoCuadro } from '@/componentes/IconoCuadro';
import { useMensaje } from '@/contexto/MensajeContext';
import { useSesion } from '@/contexto/SesionContext';
import { useBorrarContacto, useContactos, useGuardarContacto } from '@/hooks/useContactos';
import { useUnidad } from '@/hooks/useResidentes';
import {
  MAXIMO_CONTACTOS,
  mensajeDeErrorContacto,
  type Contacto,
  type DatosContacto,
} from '@/repositorios/contactos';
import { textoDeUnidad } from '@/repositorios/residentes';
import { colores, espacios, radios, sombras, tamanos, tipografia } from '@/tema';
import { confirmar } from '@/utilidades/confirmar';

// Formulario vacío para un contacto nuevo.
const CONTACTO_VACIO: DatosContacto = { nombre: '', telefono: '', parentesco: '', correo: '' };

// Un teléfono válido tiene de 6 a 20 caracteres entre dígitos, espacios y guiones, con + opcional.
const FORMATO_TELEFONO = /^\+?[\d\s-]{6,20}$/;

// Comprobación sencilla de formato (algo@algo.algo) para el correo opcional.
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Revisa el formulario de un contacto (RF4: nombre, teléfono y relación; el correo es opcional).
 *
 * @returns el mensaje del primer problema encontrado, o `null` si todo está bien.
 */
function validarContacto(datos: DatosContacto): string | null {
  if (!datos.nombre.trim()) return 'Escribe el nombre del contacto.';
  if (!FORMATO_TELEFONO.test(datos.telefono.trim())) return 'Escribe un teléfono válido.';
  if (!datos.parentesco.trim()) return 'Escribe la relación, por ejemplo: hija.';
  if (datos.correo.trim() && !FORMATO_CORREO.test(datos.correo.trim())) {
    return 'El correo no es válido. Corrígelo o déjalo vacío.';
  }
  return null;
}

/** P8 · Perfil del residente con sus contactos de emergencia (RF4). */
export default function Perfil() {
  const { perfil, sesion, cerrarSesion } = useSesion();
  const { mostrarMensaje } = useMensaje();
  const unidad = useUnidad(perfil?.unidad_id);
  const contactos = useContactos(perfil?.id);
  const guardar = useGuardarContacto(perfil?.id);
  const borrar = useBorrarContacto();
  // `null` = formulario cerrado; `id: null` = contacto nuevo; `id` con valor = se edita ese contacto.
  const [formulario, setFormulario] = useState<{ id: string | null; datos: DatosContacto } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const lista = contactos.data ?? [];
  const completo = lista.length >= MAXIMO_CONTACTOS;

  /** Abre el formulario vacío para un contacto nuevo. */
  function agregar() {
    setError(null);
    setFormulario({ id: null, datos: CONTACTO_VACIO });
  }

  /** Abre el formulario con los datos de un contacto existente. */
  function editar(contacto: Contacto) {
    setError(null);
    setFormulario({
      id: contacto.id,
      datos: {
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        parentesco: contacto.parentesco ?? '',
        correo: contacto.correo ?? '',
      },
    });
  }

  /** Cambia un campo del formulario abierto. */
  function cambiar(campo: keyof DatosContacto, valor: string) {
    setFormulario((f) => (f ? { ...f, datos: { ...f.datos, [campo]: valor } } : f));
  }

  /** Valida el formulario y guarda el contacto (nuevo o editado); al terminar lo cierra y confirma. */
  function guardarContacto() {
    if (!formulario) return;
    setError(null);
    const problema = validarContacto(formulario.datos);
    if (problema) return setError(problema);
    const esNuevo = formulario.id === null;
    guardar.mutate(
      { contactoId: formulario.id, datos: formulario.datos },
      {
        onSuccess: () => {
          setFormulario(null);
          mostrarMensaje(esNuevo ? '✅ Contacto agregado' : '✅ Contacto actualizado');
        },
        onError: (e) => setError(mensajeDeErrorContacto(e)),
      },
    );
  }

  /** Pide confirmación y borra el contacto que se está editando. */
  function confirmarBorrado(contactoId: string, nombre: string) {
    confirmar(
      'Borrar contacto',
      `${nombre} dejará de ser tu contacto de emergencia.`,
      'Borrar',
      () => {
        setError(null);
        borrar.mutate(contactoId, {
          onSuccess: () => {
            setFormulario(null);
            mostrarMensaje('🗑️ Contacto borrado');
          },
          onError: (e) => setError(mensajeDeErrorContacto(e)),
        });
      },
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flexible}
      >
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo}>Perfil</Text>

          {/* Tarjeta del residente: iniciales, nombre, unidad y correo (mockup P8). */}
          <View style={[estilos.tarjeta, estilos.fila]}>
            <Avatar nombre={perfil?.nombre} apellido={perfil?.apellido} tamano={64} />
            <View style={estilos.flexible}>
              <Text style={estilos.nombrePerfil}>
                {perfil?.nombre} {perfil?.apellido}
              </Text>
              {unidad.data ? (
                <Text style={estilos.detalle}>🏠 {textoDeUnidad(unidad.data)}</Text>
              ) : null}
              {sesion?.user.email ? <Text style={estilos.detalle}>{sesion.user.email}</Text> : null}
            </View>
          </View>

          <View style={estilos.seccion}>
            <View style={estilos.fila}>
              <Text style={[estilos.etiqueta, estilos.flexible]}>Contactos de emergencia</Text>
              <Text style={estilos.contador}>
                {lista.length} de {MAXIMO_CONTACTOS}
              </Text>
            </View>

            {contactos.isPending ? (
              <ActivityIndicator color={colores.principal} />
            ) : contactos.isError ? (
              <>
                <Text accessibilityRole="alert" style={estilos.error}>
                  No pudimos cargar tus contactos.
                </Text>
                <Boton
                  variante="secundario"
                  texto="Reintentar"
                  alPresionar={() => contactos.refetch()}
                />
              </>
            ) : lista.length === 0 && !formulario ? (
              <EstadoVacio emoji="📇" mensaje="Todavía no tienes contactos de emergencia." />
            ) : (
              lista.map((contacto) => (
                <View key={contacto.id} style={[estilos.tarjeta, estilos.fila]}>
                  <IconoCuadro icono="phone" />
                  <View style={estilos.flexible}>
                    <Text style={estilos.nombre}>{contacto.nombre}</Text>
                    <Text style={estilos.detalle}>
                      {contacto.parentesco ? `${contacto.parentesco} · ` : ''}
                      {contacto.telefono}
                    </Text>
                    {contacto.correo ? (
                      <Text style={estilos.detalle}>{contacto.correo}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar a ${contacto.nombre}`}
                    onPress={() => editar(contacto)}
                    style={estilos.accion}
                  >
                    <Text style={estilos.textoAccion}>Editar</Text>
                  </Pressable>
                </View>
              ))
            )}

            {formulario ? (
              <View style={estilos.tarjeta}>
                <Text style={estilos.nombre}>
                  {formulario.id ? 'Editar contacto' : 'Nuevo contacto'}
                </Text>
                <CampoTexto
                  etiqueta="Nombre"
                  value={formulario.datos.nombre}
                  onChangeText={(v) => cambiar('nombre', v)}
                  autoCapitalize="words"
                />
                <CampoTexto
                  etiqueta="Teléfono"
                  value={formulario.datos.telefono}
                  onChangeText={(v) => cambiar('telefono', v)}
                  keyboardType="phone-pad"
                />
                <CampoTexto
                  etiqueta="Relación"
                  placeholder="Por ejemplo: hija, esposo, vecino"
                  value={formulario.datos.parentesco}
                  onChangeText={(v) => cambiar('parentesco', v)}
                />
                <CampoTexto
                  etiqueta="Correo (opcional)"
                  value={formulario.datos.correo}
                  onChangeText={(v) => cambiar('correo', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error ? (
                  <Text accessibilityRole="alert" style={estilos.error}>
                    {error}
                  </Text>
                ) : null}
                <Boton
                  icono="check"
                  texto="Guardar contacto"
                  alPresionar={guardarContacto}
                  cargando={guardar.isPending}
                />
                <Boton
                  variante="secundario"
                  texto="Cancelar"
                  alPresionar={() => setFormulario(null)}
                />
                {formulario.id ? (
                  <Boton
                    variante="peligro"
                    icono="trash-2"
                    texto="Borrar contacto"
                    alPresionar={() =>
                      confirmarBorrado(formulario.id as string, formulario.datos.nombre)
                    }
                    cargando={borrar.isPending}
                  />
                ) : null}
              </View>
            ) : contactos.isSuccess && !completo ? (
              <Boton
                variante="secundario"
                icono="plus"
                texto="Agregar contacto"
                alPresionar={agregar}
              />
            ) : contactos.isSuccess ? (
              // Con 3 contactos el botón desaparece (RF4 y corrección 6 de DISENO.md).
              <Text style={estilos.detalle}>
                Ya tienes {MAXIMO_CONTACTOS} de {MAXIMO_CONTACTOS} contactos. Para agregar otro,
                primero borra uno desde el botón Editar.
              </Text>
            ) : null}

            <Text style={estilos.detalle}>
              🛟 La guardia verá estos contactos si envías una alerta.
            </Text>
          </View>

          <Boton
            variante="peligro"
            icono="log-out"
            texto="Cerrar sesión"
            alPresionar={() =>
              cerrarSesion().catch((e) => console.error('No se pudo cerrar la sesión', e))
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos con los tokens del tema: tarjetas blancas de radio 16 sobre el fondo gris de la app.
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flexible: { flex: 1 },
  contenido: { padding: espacios.margenLateral, gap: 20 },
  titulo: { ...tipografia.tituloPantalla, color: colores.texto },
  seccion: { gap: espacios.entreTarjetas },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tarjeta: {
    ...sombras.tarjeta,
    padding: 16,
    gap: 10,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  nombrePerfil: { ...tipografia.titulo, fontSize: 20, color: colores.texto },
  etiqueta: { ...tipografia.etiqueta, color: colores.textoSecundario },
  contador: { ...tipografia.subtitulo, color: colores.principal },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  // "Editar" ocupa al menos 44 px de alto y de ancho (área táctil mínima, RNF8).
  accion: {
    minHeight: tamanos.areaTactilMinima,
    minWidth: tamanos.areaTactilMinima,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAccion: { ...tipografia.subtitulo, color: colores.principal },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

/**
 * Ruta `/residente/perfil` (rol Residente): pantalla P8 · Perfil y contactos de emergencia. RF4.
 *
 * Qué hace: muestra el nombre y el teléfono del residente, sus contactos de emergencia ("2 de 3") con
 * las acciones editar y borrar, el formulario para agregar o editar un contacto y el botón para cerrar
 * sesión.
 * Cómo funciona: sigue la corrección 6 de docs/design/DISENO.md: máximo 3 contactos, y el botón
 * "Agregar contacto" se oculta al llegar a 3. El formulario se abre en la misma pantalla.
 * Se usa con: `src/hooks/useContactos.ts`, `src/repositorios/contactos.ts` (tipos y mensajes),
 * `useSesion` (perfil y cerrar sesión), `Boton`, `CampoTexto`, `confirmar` y el tema.
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

import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { useSesion } from '@/contexto/SesionContext';
import { useBorrarContacto, useContactos, useGuardarContacto } from '@/hooks/useContactos';
import {
  MAXIMO_CONTACTOS,
  mensajeDeErrorContacto,
  type Contacto,
  type DatosContacto,
} from '@/repositorios/contactos';
import { colores, espacios, radios, tamanos, tipografia } from '@/tema';
import { confirmar } from '@/utilidades/confirmar';

// Formulario vacío para un contacto nuevo.
const CONTACTO_VACIO: DatosContacto = { nombre: '', telefono: '', parentesco: '' };

// Un teléfono válido tiene de 6 a 15 dígitos; se admiten espacios, guiones y el signo + inicial.
const FORMATO_TELEFONO = /^\+?[\d\s-]{6,20}$/;

/** P8 · Perfil del residente con sus contactos de emergencia (RF4). */
export default function Perfil() {
  const { perfil, cerrarSesion } = useSesion();
  const contactos = useContactos(perfil?.id);
  const guardar = useGuardarContacto(perfil?.id);
  const borrar = useBorrarContacto();
  // `null` = formulario cerrado; `id: null` = contacto nuevo; `id` con valor = se edita ese contacto.
  const [formulario, setFormulario] = useState<{ id: string | null; datos: DatosContacto } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const lista = contactos.data ?? [];
  const puedeAgregar = lista.length < MAXIMO_CONTACTOS;

  /** Abre el formulario con los datos de un contacto existente. */
  function editar(contacto: Contacto) {
    setError(null);
    setFormulario({
      id: contacto.id,
      datos: {
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        parentesco: contacto.parentesco ?? '',
      },
    });
  }

  /** Cambia un campo del formulario abierto. */
  function cambiar(campo: keyof DatosContacto, valor: string) {
    setFormulario((f) => (f ? { ...f, datos: { ...f.datos, [campo]: valor } } : f));
  }

  /** Valida el formulario y guarda el contacto (nuevo o editado); al terminar lo cierra. */
  function guardarContacto() {
    if (!formulario) return;
    setError(null);
    const { nombre, telefono } = formulario.datos;
    if (!nombre.trim()) return setError('Escribe el nombre del contacto.');
    if (!FORMATO_TELEFONO.test(telefono.trim())) return setError('Escribe un teléfono válido.');
    guardar.mutate(
      { contactoId: formulario.id, datos: formulario.datos },
      {
        onSuccess: () => setFormulario(null),
        onError: (e) => setError(mensajeDeErrorContacto(e)),
      },
    );
  }

  /** Pide confirmación y borra un contacto. */
  function confirmarBorrado(contacto: Contacto) {
    confirmar('Borrar contacto', `${contacto.nombre} dejará de ser tu contacto.`, 'Borrar', () => {
      setError(null);
      borrar.mutate(contacto.id, { onError: (e) => setError(mensajeDeErrorContacto(e)) });
    });
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flexible}
      >
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.tarjeta}>
            <Text style={estilos.titulo}>
              {perfil?.nombre} {perfil?.apellido}
            </Text>
            <Text style={estilos.detalle}>Residente</Text>
            {perfil?.telefono ? <Text style={estilos.detalle}>{perfil.telefono}</Text> : null}
          </View>

          <View style={estilos.seccion}>
            <View style={estilos.filaTitulo}>
              <Text style={[estilos.tituloSeccion, estilos.flexible]}>Contactos de emergencia</Text>
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
            ) : lista.length === 0 ? (
              <Text style={estilos.detalle}>Todavía no tienes contactos de emergencia.</Text>
            ) : (
              lista.map((contacto) => (
                <View key={contacto.id} style={estilos.tarjeta}>
                  <Text style={estilos.nombre}>{contacto.nombre}</Text>
                  <Text style={estilos.detalle}>
                    {contacto.parentesco ? `${contacto.parentesco} · ` : ''}
                    {contacto.telefono}
                  </Text>
                  <View style={estilos.acciones}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => editar(contacto)}
                      style={estilos.accion}
                    >
                      <Text style={estilos.textoAccion}>Editar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => confirmarBorrado(contacto)}
                      style={estilos.accion}
                    >
                      <Text style={[estilos.textoAccion, estilos.peligro]}>Borrar</Text>
                    </Pressable>
                  </View>
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
                  etiqueta="Parentesco (opcional)"
                  value={formulario.datos.parentesco}
                  onChangeText={(v) => cambiar('parentesco', v)}
                />
                <Boton texto="Guardar" alPresionar={guardarContacto} cargando={guardar.isPending} />
                <Boton
                  variante="secundario"
                  texto="Cancelar"
                  alPresionar={() => setFormulario(null)}
                />
              </View>
            ) : puedeAgregar && contactos.isSuccess ? (
              // Con 3 contactos el botón desaparece (corrección 6 de DISENO.md).
              <Boton
                variante="secundario"
                texto="Agregar contacto"
                alPresionar={() => {
                  setError(null);
                  setFormulario({ id: null, datos: CONTACTO_VACIO });
                }}
              />
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" style={estilos.error}>
                {error}
              </Text>
            ) : null}
          </View>

          <Boton
            variante="secundario"
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
  contenido: { padding: espacios.margenLateral, gap: 24 },
  seccion: { gap: espacios.entreTarjetas },
  filaTitulo: { flexDirection: 'row', alignItems: 'center' },
  titulo: { ...tipografia.titulo, color: colores.texto },
  tituloSeccion: { ...tipografia.titulo, fontSize: 18, color: colores.texto },
  contador: { ...tipografia.subtitulo, color: colores.principal },
  tarjeta: {
    padding: 16,
    gap: 8,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
  },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  detalle: { ...tipografia.cuerpo, color: colores.textoSecundario },
  acciones: { flexDirection: 'row', gap: 24 },
  // Cada acción ocupa al menos 44 px de alto (área táctil mínima, RNF8).
  accion: { minHeight: tamanos.areaTactilMinima, justifyContent: 'center' },
  textoAccion: { ...tipografia.subtitulo, color: colores.principal },
  peligro: { color: colores.peligroTexto },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

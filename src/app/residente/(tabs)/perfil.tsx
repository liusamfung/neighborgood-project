/**
 * Ruta `/residente/perfil` (rol Residente): pantalla P8 · Perfil y contactos de emergencia del mockup.
 * Muestra el perfil real y administra hasta tres contactos: crear, editar y eliminar con confirmación.
 * La barra de `(tabs)/_layout.tsx` registra esta ruta. Usa SesionContext y useContactosEmergencia.
 * El formulario modal pertenece a esta pantalla; TarjetaContacto presenta cada fila.
 * El acceso a Supabase queda en el repositorio y RLS.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TarjetaContacto } from '@/componentes/contactos/TarjetaContacto';
import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { useSesion } from '@/contexto/SesionContext';
import { useContactosEmergencia } from '@/hooks/useContactosEmergencia';
import { colores, espacios, radios, tipografia } from '@/tema';
import type { BorradorContacto, ContactoEmergencia } from '@/tipos/contacto';
import {
  MAXIMO_CONTACTOS,
  mensajeErrorContacto,
  borradorContacto,
  validarContacto,
} from '@/utilidades/contactosEmergencia';

/** Perfil P8: conserva los datos del servidor y solo confirma cambios después de su respuesta. */
export default function Perfil() {
  const { perfil, sesion, cerrarSesion } = useSesion();
  const margenes = useSafeAreaInsets();
  const { consulta, cambio } = useContactosEmergencia(perfil?.id);
  const { refetch } = consulta;
  // undefined cierra el editor; null crea; una fila existente edita sin cambiar id ni orden.
  const [editor, setEditor] = useState<ContactoEmergencia | null | undefined>(undefined);
  const [porEliminar, setPorEliminar] = useState<ContactoEmergencia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const contactos = consulta.data ?? [];
  const bloqueado = cambio.isPending || consulta.isPending || consulta.isError || saliendo;
  // Si otro dispositivo borra la fila, su confirmación deja de bloquear las demás acciones.
  const confirmando =
    porEliminar !== null && contactos.some((contacto) => contacto.id === porEliminar.id);

  // Las pestañas permanecen montadas. Al volver se comprueban cambios hechos en otro dispositivo.
  useFocusEffect(
    useCallback(() => {
      // Refetch fuerza una consulta aunque enabled sea false: esperar al perfil evita enviar
      // un propietario indefinido mientras se recupera la sesión al abrir la aplicación.
      if (perfil?.id) void refetch();
    }, [perfil?.id, refetch]),
  );

  /** Abre un formulario limpio o precargado; las notificaciones anteriores no se confunden con él. */
  function abrirEditor(contacto: ContactoEmergencia | null) {
    setMensaje(null);
    setError(null);
    setPorEliminar(null);
    setEditor(contacto);
  }

  /** El hook espera a refrescar la lista antes de cerrar el formulario y comunicar el éxito. */
  async function guardar(borrador: BorradorContacto) {
    if (editor === undefined) return;
    await cambio.mutateAsync(
      editor ? { accion: 'editar', id: editor.id, borrador } : { accion: 'crear', borrador },
    );
    setEditor(undefined);
    setMensaje(editor ? 'Contacto actualizado.' : 'Contacto agregado.');
  }

  /** La confirmación es parte de la página y funciona igual en Android, iOS y web. */
  async function confirmarEliminacion() {
    if (!porEliminar || cambio.isPending) return;
    setError(null);
    setMensaje(null);
    try {
      await cambio.mutateAsync({ accion: 'eliminar', id: porEliminar.id });
      setPorEliminar(null);
      setMensaje('Contacto eliminado. Ya puedes agregar otro.');
    } catch (fallo) {
      setError(mensajeErrorContacto(fallo));
    }
  }

  /** Informa un fallo al salir en lugar de dejar un botón que parece no responder. */
  async function salir() {
    setSaliendo(true);
    setError(null);
    try {
      await cerrarSesion();
    } catch {
      setError('No pudimos cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      setSaliendo(false);
    }
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[
        estilos.contenido,
        { paddingTop: margenes.top + 20, paddingBottom: margenes.bottom + 24 },
      ]}
    >
      <Text accessibilityRole="header" style={estilos.titulo}>
        Perfil
      </Text>
      <View style={estilos.perfil}>
        <View style={estilos.avatar}>
          <Text style={estilos.iniciales}>
            {perfil?.nombre.at(0)}
            {perfil?.apellido.at(0)}
          </Text>
        </View>
        <View style={estilos.datosPerfil}>
          <Text style={estilos.nombre}>
            {perfil?.nombre} {perfil?.apellido}
          </Text>
          <Text style={estilos.ayuda}>Residente</Text>
          <Text style={estilos.ayuda}>{sesion?.user.email}</Text>
          {perfil?.telefono ? <Text style={estilos.ayuda}>{perfil.telefono}</Text> : null}
        </View>
      </View>
      <View style={estilos.encabezado}>
        <Text accessibilityRole="header" style={estilos.seccion}>
          Contactos de emergencia
        </Text>
        {consulta.data ? (
          <Text style={estilos.contador}>
            {contactos.length} de {MAXIMO_CONTACTOS}
          </Text>
        ) : null}
      </View>
      <Text style={estilos.ayuda}>Registra hasta tres personas de confianza.</Text>
      {mensaje ? (
        <Text accessibilityLiveRegion="polite" role="status" style={estilos.exito}>
          {mensaje}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      ) : null}
      {consulta.isPending ? (
        <ActivityIndicator accessibilityLabel="Cargando contactos" color={colores.principal} />
      ) : null}
      {consulta.isError ? (
        <View style={estilos.estado}>
          <Text accessibilityRole="alert" style={estilos.error}>
            No pudimos actualizar tus contactos. Revisa tu conexión.
          </Text>
          <Boton
            texto="Reintentar"
            variante="secundario"
            alPresionar={() => {
              void refetch();
            }}
            cargando={consulta.isFetching}
          />
        </View>
      ) : null}
      {!consulta.isPending && !consulta.isError && contactos.length === 0 ? (
        <View style={estilos.estado}>
          <Text style={estilos.ayuda}>Todavía no tienes contactos de emergencia.</Text>
        </View>
      ) : null}
      {contactos.map((contacto) => (
        <View key={contacto.id}>
          <TarjetaContacto
            contacto={contacto}
            deshabilitado={bloqueado || confirmando}
            alEditar={() => abrirEditor(contacto)}
            alEliminar={() => {
              setPorEliminar(contacto);
              setError(null);
              setMensaje(null);
            }}
          />
          {porEliminar?.id === contacto.id ? (
            <View style={estilos.confirmacion}>
              <Text accessibilityRole="alert" style={estilos.ayuda}>
                ¿Eliminar a {contacto.nombre} de tus contactos de emergencia?
              </Text>
              <Boton
                texto="Sí, eliminar contacto"
                alPresionar={confirmarEliminacion}
                cargando={cambio.isPending}
              />
              <Boton
                texto="Conservar contacto"
                variante="secundario"
                deshabilitado={cambio.isPending}
                alPresionar={() => setPorEliminar(null)}
              />
            </View>
          ) : null}
        </View>
      ))}
      {!consulta.isPending && !consulta.isError && contactos.length < MAXIMO_CONTACTOS ? (
        <Boton
          texto="Agregar contacto"
          variante="secundario"
          deshabilitado={bloqueado || confirmando}
          alPresionar={() => abrirEditor(null)}
        />
      ) : null}
      {contactos.length === MAXIMO_CONTACTOS ? (
        <Text style={estilos.ayuda}>
          Completaste tus 3 contactos. Puedes editarlos o eliminar uno para agregar otro.
        </Text>
      ) : null}
      <Text style={estilos.ayuda}>
        La guardia y la directiva pueden consultar estos contactos cuando tengas una alerta en
        curso.
      </Text>
      <Boton
        texto="Actualizar contactos"
        variante="secundario"
        deshabilitado={cambio.isPending || saliendo}
        cargando={consulta.isFetching && !consulta.isPending}
        alPresionar={() => {
          void refetch();
        }}
      />
      <View style={estilos.salida}>
        <Boton
          texto="Cerrar sesión"
          variante="secundario"
          cargando={saliendo}
          deshabilitado={cambio.isPending}
          alPresionar={salir}
        />
      </View>
      {editor !== undefined ? (
        <EditorContacto
          contacto={editor}
          guardando={cambio.isPending}
          alCerrar={() => setEditor(undefined)}
          alGuardar={guardar}
        />
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: {
    padding: espacios.margenLateral,
    gap: espacios.entreTarjetas,
    paddingBottom: 48,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  titulo: { ...tipografia.titulo, color: colores.texto },
  perfil: {
    padding: 20,
    gap: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radios.tarjeta,
    borderColor: colores.borde,
    borderWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colores.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: { ...tipografia.titulo, color: colores.principal, textTransform: 'uppercase' },
  datosPerfil: { flex: 1, gap: 4 },
  nombre: { ...tipografia.subtitulo, color: colores.texto },
  encabezado: {
    marginTop: 8,
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccion: { ...tipografia.subtitulo, color: colores.texto, flexShrink: 1 },
  contador: { ...tipografia.subtitulo, color: colores.principal },
  ayuda: { ...tipografia.cuerpo, color: colores.textoSecundario, lineHeight: 21 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  exito: { ...tipografia.cuerpo, color: colores.principal },
  estado: {
    padding: 16,
    gap: 12,
    backgroundColor: colores.superficie,
    borderRadius: radios.tarjeta,
  },
  confirmacion: {
    marginTop: 8,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colores.peligroBorde,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.superficie,
  },
  salida: { marginTop: 12 },
});

/** El componente se monta de nuevo en cada apertura para no reutilizar un borrador anterior. */
type PropsEditorContacto = {
  contacto: ContactoEmergencia | null;
  guardando: boolean;
  alCerrar: () => void;
  alGuardar: (borrador: BorradorContacto) => Promise<void>;
};

/** Editor con título, datos requeridos, correo opcional, cancelación y confirmación de guardado. */
function EditorContacto({ contacto, guardando, alCerrar, alGuardar }: PropsEditorContacto) {
  const margenes = useSafeAreaInsets();
  const [borrador, setBorrador] = useState(() => borradorContacto(contacto));
  const [intentado, setIntentado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const enviando = useRef(false);
  const errores = intentado ? validarContacto(borrador) : {};

  /** Cambia solo el campo indicado; el error de conexión anterior deja de ocupar el formulario. */
  function cambiar(campo: keyof BorradorContacto, valor: string) {
    setBorrador((actual) => ({ ...actual, [campo]: valor }));
    setErrorEnvio(null);
  }

  /** Valida antes de acceder al servidor y mantiene el texto si la operación es rechazada. */
  async function guardar() {
    if (enviando.current) return;
    setIntentado(true);
    setErrorEnvio(null);
    if (Object.keys(validarContacto(borrador)).length) return;
    enviando.current = true;
    try {
      await alGuardar(borrador);
    } catch (error) {
      setErrorEnvio(mensajeErrorContacto(error));
    } finally {
      enviando.current = false;
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!guardando) alCerrar();
      }}
    >
      <KeyboardAvoidingView
        style={estilosEditor.fondo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            estilosEditor.contenido,
            { paddingTop: margenes.top + 20, paddingBottom: margenes.bottom + 24 },
          ]}
        >
          <Text accessibilityRole="header" style={estilosEditor.titulo}>
            {contacto ? 'Editar contacto' : 'Nuevo contacto'}
          </Text>
          <Text style={estilosEditor.ayuda}>Nombre, teléfono y relación son obligatorios.</Text>
          <CampoTexto
            etiqueta="Nombre del contacto"
            value={borrador.nombre}
            editable={!guardando}
            autoCapitalize="words"
            onChangeText={(valor) => cambiar('nombre', valor)}
          />
          {errores.nombre ? (
            <Text accessibilityRole="alert" style={estilosEditor.error}>
              {errores.nombre}
            </Text>
          ) : null}
          <CampoTexto
            etiqueta="Teléfono del contacto"
            value={borrador.telefono}
            editable={!guardando}
            keyboardType="phone-pad"
            autoComplete="tel"
            onChangeText={(valor) => cambiar('telefono', valor)}
          />
          {errores.telefono ? (
            <Text accessibilityRole="alert" style={estilosEditor.error}>
              {errores.telefono}
            </Text>
          ) : null}
          <CampoTexto
            etiqueta="Relación con el contacto"
            placeholder="Por ejemplo: hermana, amigo o vecino"
            value={borrador.parentesco}
            editable={!guardando}
            onChangeText={(valor) => cambiar('parentesco', valor)}
          />
          {errores.parentesco ? (
            <Text accessibilityRole="alert" style={estilosEditor.error}>
              {errores.parentesco}
            </Text>
          ) : null}
          <CampoTexto
            etiqueta="Correo del contacto (opcional)"
            value={borrador.correo}
            editable={!guardando}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(valor) => cambiar('correo', valor)}
          />
          {errores.correo ? (
            <Text accessibilityRole="alert" style={estilosEditor.error}>
              {errores.correo}
            </Text>
          ) : null}
          {errorEnvio ? (
            <Text accessibilityRole="alert" style={estilosEditor.error}>
              {errorEnvio}
            </Text>
          ) : null}
          <View style={estilosEditor.acciones}>
            <Boton texto="Guardar contacto" alPresionar={guardar} cargando={guardando} />
            <Boton
              texto="Cancelar"
              alPresionar={alCerrar}
              variante="secundario"
              deshabilitado={guardando}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilosEditor = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: {
    padding: espacios.margenLateral,
    paddingTop: 48,
    paddingBottom: 48,
    gap: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  titulo: { ...tipografia.titulo, color: colores.texto },
  ayuda: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  acciones: { gap: 12, marginTop: 8 },
});

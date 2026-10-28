import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { useSesion } from '@/contexto/SesionContext';
import { iniciarSesion, mensajeDeError } from '@/repositorios/sesion';
import { colores, espacios, tipografia } from '@/tema';

/** P1 · Inicio de sesión con correo y contraseña (RF2). El registro (RF1) es otra pantalla. */
export default function Login() {
  const { rechazo, limpiarRechazo } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El rechazo viene del contexto (sesión sin perfil): la app ya cerró la sesión.
  const mensaje = error ?? rechazo;

  async function entrar() {
    limpiarRechazo();
    setError(null);
    // El correo se normaliza igual que en residentes_habilitados (minúsculas, sin espacios).
    const correoLimpio = correo.trim().toLowerCase();
    if (!correoLimpio || !contrasena) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setEnviando(true);
    try {
      await iniciarSesion(correoLimpio, contrasena);
      // Si todo sale bien, el contexto carga el perfil y la navegación abre la pantalla del rol.
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.pantalla}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <Text style={estilos.marca}>NeighborGood</Text>
          <Text style={estilos.lema}>Tu condominio, más cerca</Text>
        </View>

        <View style={estilos.formulario}>
          <CampoTexto
            etiqueta="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <CampoTexto
            etiqueta="Contraseña"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={entrar}
          />

          {mensaje ? (
            <Text accessibilityRole="alert" style={estilos.error}>
              {mensaje}
            </Text>
          ) : null}

          <Boton texto="Iniciar sesión" alPresionar={entrar} cargando={enviando} />
        </View>

        <View style={estilos.pie}>
          <Text style={estilos.texto}>
            ¿Primera vez?{' '}
            <Link href="/registro" style={estilos.enlace}>
              Crear cuenta
            </Link>
          </Text>
          <Text style={estilos.nota}>
            Solo pueden registrarse los correos habilitados por la directiva de tu condominio.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espacios.margenLateral,
    paddingVertical: 48,
    gap: 32,
  },
  cabecera: { alignItems: 'center', gap: 4 },
  marca: { ...tipografia.titulo, fontSize: 32, color: colores.principal },
  lema: { ...tipografia.cuerpo, color: colores.textoSecundario },
  formulario: { gap: 16 },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  pie: { alignItems: 'center', gap: 8 },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  enlace: { ...tipografia.subtitulo, color: colores.principal },
  nota: { ...tipografia.cuerpo, textAlign: 'center', color: colores.textoSecundario },
});

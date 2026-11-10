/**
 * Ruta `/registro` (sin sesión): Crear cuenta (sin mockup, ver docs/design/DISENO.md). Implementa RF1.
 *
 * Qué hace: pide correo y contraseña (dos veces), los valida y llama a `registrarse`. No pide nombre ni
 * unidad: esos datos los registró la directiva al dar de alta el correo (RF5) y el trigger de la base
 * los copia al perfil.
 * Cómo funciona: si el correo está habilitado, el trigger crea el perfil de residente y la navegación
 * abre la pantalla de su rol. Si no lo está, no hay perfil: `SesionContext` cierra la sesión y deja en
 * `rechazo` el mensaje "Tu correo no está habilitado. Contacta a la directiva", que se muestra aquí y
 * en el login. Si el proyecto exige confirmar el correo, se avisa al usuario y no se abre sesión.
 * Se usa con: `src/repositorios/sesion.ts` (`registrarse`, `mensajeDeError`),
 * `src/contexto/SesionContext.tsx` (`rechazo`), los componentes `Boton` y `CampoTexto`, el tema
 * (`src/tema`) y `(auth)/_layout.tsx` (barra superior con flecha de volver).
 */
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/formulario/Boton';
import { CampoTexto } from '@/componentes/formulario/CampoTexto';
import { useSesion } from '@/contexto/SesionContext';
import { mensajeDeError, registrarse } from '@/repositorios/sesion';
import { colores, espacios, tipografia } from '@/tema';

// Mismo mínimo que exige Supabase Auth (`minimum_password_length` en supabase/config.toml).
const LARGO_MINIMO_CONTRASENA = 6;

// Comprobación sencilla de formato (algo@algo.algo); la validación real la hace Supabase Auth.
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Revisa los campos antes de llamar al servidor.
 *
 * @returns el mensaje del primer problema encontrado, o `null` si todo está bien.
 */
function validar(correo: string, contrasena: string, repeticion: string): string | null {
  if (!correo || !contrasena || !repeticion) return 'Completa todos los campos.';
  if (!FORMATO_CORREO.test(correo)) return 'Escribe un correo válido.';
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  if (contrasena !== repeticion) return 'Las contraseñas no coinciden.';
  return null;
}

/** Crear cuenta de residente (RF1): solo funciona con un correo habilitado por la directiva. */
export default function Registro() {
  const { rechazo, limpiarRechazo } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repeticion, setRepeticion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // true cuando la cuenta se creó pero Supabase pide confirmar el correo antes de entrar.
  const [faltaConfirmar, setFaltaConfirmar] = useState(false);

  // El rechazo viene del contexto (cuenta creada sin perfil): la app ya cerró la sesión.
  const mensaje = error ?? rechazo;

  /**
   * Valida los campos y crea la cuenta. Si Supabase abre la sesión no hace nada más: el contexto carga
   * el perfil y la navegación cambia sola (o rechaza el correo no habilitado con su mensaje).
   */
  async function crearCuenta() {
    limpiarRechazo();
    setError(null);
    // El correo se normaliza igual que en residentes_habilitados (minúsculas, sin espacios).
    const correoLimpio = correo.trim().toLowerCase();
    const problema = validar(correoLimpio, contrasena, repeticion);
    if (problema) {
      setError(problema);
      return;
    }
    setEnviando(true);
    try {
      const resultado = await registrarse(correoLimpio, contrasena);
      if (resultado === 'falta_confirmar') setFaltaConfirmar(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  // Cuenta creada, pendiente de confirmar el correo: se reemplaza el formulario por el aviso.
  if (faltaConfirmar) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Text style={estilos.titulo}>Revisa tu correo</Text>
        <Text style={estilos.texto}>
          Te enviamos un mensaje a {correo.trim().toLowerCase()} para confirmar tu cuenta. Después
          de confirmarla, inicia sesión.
        </Text>
        <Link href="/login" style={estilos.enlace}>
          Ir a iniciar sesión
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.pantalla}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.nota}>
          Usa el correo que la directiva de tu condominio dio de alta. Tu nombre y tu unidad ya
          están registrados con ese correo.
        </Text>

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
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
          <CampoTexto
            etiqueta="Repite la contraseña"
            value={repeticion}
            onChangeText={setRepeticion}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={crearCuenta}
          />

          {mensaje ? (
            <Text accessibilityRole="alert" style={estilos.error}>
              {mensaje}
            </Text>
          ) : null}

          <Boton texto="Crear cuenta" alPresionar={crearCuenta} cargando={enviando} />
        </View>

        <Text style={[estilos.texto, estilos.centrado]}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={estilos.enlace}>
            Inicia sesión
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Estilos con los tokens del tema; mismos márgenes y separaciones que el login.
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espacios.margenLateral,
    paddingVertical: 24,
    gap: 24,
  },
  formulario: { gap: 16 },
  titulo: { ...tipografia.titulo, color: colores.texto },
  nota: { ...tipografia.cuerpo, color: colores.textoSecundario },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
  texto: { ...tipografia.cuerpo, color: colores.texto },
  centrado: { textAlign: 'center' },
  enlace: { ...tipografia.subtitulo, color: colores.principal },
});

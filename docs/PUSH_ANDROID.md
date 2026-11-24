# Push en Android: guía de instalación y prueba (issue #7)

Cómo dejar un teléfono Android recibiendo notificaciones push con la app **cerrada**. Sirve para el celular de
la demostración (por ejemplo, un Samsung Galaxy S21 FE). Un iPhone con cuenta de Apple gratuita no recibe push
remotas; ese caso queda fuera.

## Cómo funciona (en corto)
1. La app pide permiso y obtiene un **token de Expo Push** del teléfono; lo guarda en la tabla `dispositivos`
   con la función `registrar_dispositivo` (al iniciar sesión) y lo quita al cerrar sesión.
2. Las Edge Functions (`notificar-alerta`, `notificar-incidencia`, `validar-pase`) leen esos tokens y le piden
   a Expo que envíe la push; Expo la entrega por **Firebase (FCM)** al teléfono.
3. Para eso hacen falta **dos archivos distintos de Firebase**:

| Archivo | Para qué sirve | Dónde va | ¿Es secreto? |
|---|---|---|---|
| `google-services.json` | Registra la app Android en FCM (va dentro de la build) | Variable de archivo `GOOGLE_SERVICES_JSON` de EAS; copia local en la raíz | No es una clave, pero se mantiene fuera de git |
| Clave de cuenta de servicio (`*-firebase-adminsdk-*.json`) | Permite a Expo enviar push a tu proyecto de Firebase | Se sube a EAS (credenciales); nunca al repositorio | **Sí** |

Ambos están en `.gitignore`.

## Parte 1: Firebase y Expo (en la computadora)
1. En [console.firebase.google.com](https://console.firebase.google.com): **Agregar proyecto** → nombre
   `NeighborGood` → sin Google Analytics.
2. En la página del proyecto, ícono de **Android** → nombre de paquete **exactamente**
   `com.liusamfung.neighborgood` → **Registrar app** → descargar `google-services.json` y dejarlo en la raíz
   del proyecto. Saltar el resto del asistente.
3. Engranaje → **Configuración del proyecto** → **Cuentas de servicio** → **Generar nueva clave privada**. Guardar
   el archivo fuera del repositorio (y una copia en el gestor de contraseñas).
4. Subir esa clave a Expo: en la carpeta del proyecto, `eas credentials` → Android → `production` → Google
   Service Account → *Manage your Google Service Account Key for Push Notifications (FCM V1)* → *Set up…* →
   *Upload a new service account key*. (También se puede en expo.dev → proyecto → Credentials.)
5. En expo.dev → proyecto `neighborgood` → **Environment variables** → crear `GOOGLE_SERVICES_JSON`, visibilidad
   **Secret**, tipo **File**, subir `google-services.json`, entornos **Development** y **Preview**.
6. En el SQL Editor de Supabase, ejecutar `supabase/migrations/20261125000001_registrar_dispositivo.sql`.

## Parte 2: la build de Android
```bash
eas build --platform android --profile development
```
La primera vez, EAS ofrece generar un *keystore* de Android: responder que sí. En el plan gratuito la build puede
esperar en cola entre 10 y 30 minutos. Al final entrega un **enlace y un código QR** para descargar el APK.

## Parte 3: el teléfono Samsung (One UI)
No hace falta activar las opciones de desarrollador ni la depuración USB: el APK se instala desde el enlace.
1. **Auto Blocker:** Samsung bloquea las apps que no vienen de la tienda. *Ajustes → Seguridad y privacidad →
   Auto Blocker* → desactivar (se puede volver a activar al terminar).
2. **Instalar desde el navegador:** abrir el enlace de la build en Chrome. Cuando lo pida: *Ajustes → Apps →
   Chrome → Instalar apps desconocidas → Permitir desde esta fuente*.
3. **Play Protect:** si avisa de una app desconocida, *Más detalles → Instalar de todos modos* (es tu propia build).
4. **Conexión con la computadora:** es una *development build*, así que necesita el servidor de Metro. El
   teléfono y la computadora deben estar en la **misma red Wi-Fi**. En la computadora:
   ```bash
   npx expo start --dev-client
   ```
   (si la red lo bloquea, `npx expo start --dev-client --tunnel`). En la app, elegir el servidor de la lista.
5. **Permiso de notificaciones:** al iniciar sesión, Android 13 o más nuevo lo pregunta. Tocar **Permitir**.
6. **Cuenta:** entrar con una cuenta de prueba (por ejemplo, el guardia), no con cuentas personales.
7. **Batería:** *Ajustes → Apps → NeighborGood → Batería → Sin restricciones*, y comprobar que no esté en
   "Apps en suspensión profunda". Cerrar la app deslizándola desde Recientes sirve para la prueba; **Forzar
   detención** impide recibir push.
8. **Opcional, opciones de desarrollador:** *Ajustes → Información del teléfono → Información del software →
   tocar 7 veces "Número de compilación" → PIN*. No se usa en esta guía.

## Parte 4: comprobar que funciona
1. Con la sesión iniciada en el Android, en el SQL Editor:
   ```sql
   select usuario_id, plataforma, left(expo_push_token, 22) as token, actualizado_en
   from public.dispositivos order by actualizado_en desc;
   ```
   Debe aparecer una fila `android` del usuario con el que entraste.
2. **Prueba con la app cerrada (criterio del issue #7):** deslizar la app para cerrarla y, desde otro teléfono con
   una cuenta de residente, enviar una alerta de pánico. En el Android debe llegar "🚨 Alerta …" con sonido.
3. **Con la app abierta:** la misma alerta muestra **un solo** aviso (el de la app), no dos.
4. **Cambio de cuenta:** cerrar sesión (la fila desaparece) y entrar con otro usuario (aparece una fila a su nombre).

## Si algo falla
- **No aparece la fila:** revisar que se aceptó el permiso y mirar la consola de Metro; busca "No se pudo obtener
  el token". Si dice que falta la configuración de Firebase, la build no trae `google-services.json`: revisar el
  paso 5 de la Parte 1 y repetir la build.
- **La fila existe pero no llega la push:** revisar que la clave de cuenta de servicio esté subida (paso 4) y que la
  función `notificar-alerta` esté desplegada. Probar el token en [expo.dev/notifications](https://expo.dev/notifications).
- **Expo responde con un error de autenticación:** si el proyecto activó "enhanced push security", hay que crear un
  token de acceso y guardarlo con `npx supabase secrets set EXPO_ACCESS_TOKEN=...` (ver `supabase/functions/_compartido/push.ts`).
- **Pendiente (otro issue):** quitar de la tabla los tokens que Expo reporte como `DeviceNotRegistered`, y abrir el
  detalle de la alerta al tocar la notificación.

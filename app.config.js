/**
 * Configuración dinámica de Expo: completa `app.json` con la ruta de `google-services.json` (issue #7).
 *
 * Qué hace: Firebase (FCM) necesita `google-services.json` dentro de la build de Android para que el teléfono
 * pueda recibir push con la app cerrada. Ese archivo se mantiene fuera de git (`.gitignore`), así que su ruta
 * no puede escribirse fija en `app.json`; este archivo la decide al generar la configuración:
 * - En EAS Build, el archivo llega como variable de archivo secreta `GOOGLE_SERVICES_JSON` (se crea una vez en
 *   expo.dev → Environment variables, tipo "File"); Expo la deja en el servidor y esta variable trae su ruta.
 * - En local (`npx expo run:android`), se usa `./google-services.json` en la raíz del proyecto, si existe.
 * - Si no hay ninguno de los dos (por ejemplo, quien solo trabaja en iOS), no se agrega la clave y la
 *   configuración queda como estaba: la app funciona igual, solo que esa build de Android no recibe push.
 * Cómo funciona: Expo lee `app.json`, se lo pasa a esta función como `config` y usa lo que devuelve. Todo lo
 * demás (plugins, íconos, `extra.eas.projectId`) sigue viniendo de `app.json`.
 * Se usa con: `npx expo start`, `prebuild`, `eas build` y cualquier comando de Expo; no se importa desde la app.
 * Depende de: `app.json`, la variable `GOOGLE_SERVICES_JSON` de EAS y el archivo local `google-services.json`.
 *
 * @param {{ config: import('expo/config').ExpoConfig }} entrada configuración leída de `app.json`.
 * @returns {import('expo/config').ExpoConfig} la misma configuración, con `android.googleServicesFile` si hay archivo.
 */
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const archivoLocal = path.join(__dirname, 'google-services.json');
  const archivo =
    process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(archivoLocal) ? archivoLocal : null);
  if (!archivo) return config;
  return {
    ...config,
    android: { ...config.android, googleServicesFile: archivo },
  };
};

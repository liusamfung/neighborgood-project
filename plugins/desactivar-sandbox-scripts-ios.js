const { withXcodeProject } = require('expo/config-plugins');

/**
 * Solo iOS: pone `ENABLE_USER_SCRIPT_SANDBOXING = NO` en el proyecto de Xcode.
 *
 * Xcode 15 y posteriores ejecutan los scripts de las fases de compilación dentro de un sandbox. El script
 * "Bundle React Native code and images" (que empaqueta el JavaScript en las builds Release) necesita borrar y
 * volver a escribir `main.jsbundle`; con el sandbox activo Xcode falla con:
 *   "Sandbox: node(...) deny(1) file-write-unlink .../Release-iphoneos/main.jsbundle".
 * React Native documenta este mismo ajuste. Como `ios/` se genera con `expo prebuild`, se cambia aquí y no a mano.
 *
 * Nunca afecta a Android ni a las builds de EAS.
 *
 * Se usa con: `app.json` (lista `plugins`) y `npx expo prebuild`, que aplica el cambio al proyecto `ios/`
 * (generado y no versionado). Funciona junto a `plugins/quitar-push-entitlement.js`, que también modifica iOS.
 *
 * @param config configuración de Expo (`app.json`) que recibe cualquier plugin.
 * @returns la misma configuración, con el sandbox de scripts desactivado en el proyecto de Xcode.
 */
module.exports = function desactivarSandboxDeScripts(config) {
  return withXcodeProject(config, (cfg) => {
    // `modResults` es el proyecto de Xcode; cada configuración (Debug, Release...) guarda sus ajustes
    // en `buildSettings`.
    const configuraciones = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const clave of Object.keys(configuraciones)) {
      const configuracion = configuraciones[clave];
      // La sección también trae entradas de texto (comentarios internos): solo se tocan las configuraciones.
      if (typeof configuracion === 'object' && configuracion.buildSettings) {
        configuracion.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return cfg;
  });
};

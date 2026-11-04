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
 */
module.exports = function desactivarSandboxDeScripts(config) {
  return withXcodeProject(config, (cfg) => {
    const configuraciones = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const clave of Object.keys(configuraciones)) {
      const configuracion = configuraciones[clave];
      if (typeof configuracion === 'object' && configuracion.buildSettings) {
        configuracion.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return cfg;
  });
};

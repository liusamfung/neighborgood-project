const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Opcional y solo iOS: quita el permiso de push remoto (`aps-environment`) que añade `expo-notifications`
 * cuando `NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE=1` está definido en el `.env` de quien genera `ios/`.
 *
 *   NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE=1        -> quita el permiso de push remoto de iOS.
 *   NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE=0 o vacío -> no hace nada (valor por defecto). Cualquier otro valor equivale a 0.
 *
 * Las cuentas personales (gratuitas) de Apple no pueden firmar apps con esa capacidad: Xcode falla con
 * "Personal development teams do not support the Push Notifications capability". Quitar el permiso deja
 * instalar la app en un iPhone real, pero ese teléfono no recibe push remotas (las locales sí).
 *
 * Nunca afecta a Android: este plugin solo registra un cambio de iOS. Tampoco afecta a las builds de EAS ni a
 * nadie que no active la variable, y el código de la app es el mismo para todos.
 */
module.exports = function quitarPushEntitlement(config) {
  if (process.env.NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE !== '1') {
    return config;
  }
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};

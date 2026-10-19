const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Opcional y solo iOS: quita el permiso de push remoto (`aps-environment`) que añade
 * `expo-notifications`, cuando `NEIGHBORGOOD_SIN_PUSH=1` está definido en el `.env` de quien genera `ios/`.
 *
 * Las cuentas personales (gratuitas) de Apple no pueden firmar apps con esa capacidad: Xcode falla con
 * "Personal development teams do not support the Push Notifications capability". Quitar el permiso deja
 * instalar la app en un iPhone real, pero ese teléfono no recibe push remotas (las locales sí).
 *
 * Por defecto no hace nada: Android y las builds de EAS conservan las notificaciones, y el código de la
 * app es el mismo para todos. Solo afecta a quien activa la variable, y solo en la build de iOS.
 */
module.exports = function quitarPushEntitlement(config) {
  if (process.env.NEIGHBORGOOD_SIN_PUSH !== '1') {
    return config;
  }
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};

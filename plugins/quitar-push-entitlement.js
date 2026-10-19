const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Quita el permiso de push remoto (`aps-environment`) que añade `expo-notifications`.
 *
 * Las cuentas personales (gratuitas) de Apple no pueden firmar apps con esa capacidad:
 * Xcode falla con "Personal development teams do not support the Push Notifications capability".
 * Sin el permiso la app se instala igual, pero no recibe push remotas (las locales sí funcionan).
 *
 * Con la cuenta de pago (Apple Developer Program) y para las builds de EAS, generar `ios/` con
 * `NEIGHBORGOOD_PUSH=1` para conservar el permiso, o quitar este plugin de `app.json`.
 */
module.exports = function quitarPushEntitlement(config) {
  if (process.env.NEIGHBORGOOD_PUSH === '1') {
    return config;
  }
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};

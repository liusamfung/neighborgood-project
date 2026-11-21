/**
 * Ruta `/residente/alerta/enviada` (rol Residente): pantalla P3b · Alerta enviada del mockup.
 * Provisional: el contenido aún es un marcador con `PantallaMarcador` (RF23, Sprint 5), pero ya cumple
 * su parte del RF24: al abrirse, el teléfono del emisor vibra y suena (`avisarAlertaEnviada`).
 * El tipo llega como parámetro de la ruta (`?tipo=medica`); cuando RF23 implemente el envío real, la
 * pantalla P3 lo pasará al navegar aquí. Sin parámetro válido se usa `seguridad`.
 * Se usa con: `src/componentes/PantallaMarcador.tsx`, `src/servicios/avisoDeAlerta.ts` y
 * `residente/_layout.tsx`, que la declara como pantalla apilada.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { PantallaMarcador } from '@/componentes/PantallaMarcador';
import { avisarAlertaEnviada, NOMBRE_ALERTA, type TipoAlerta } from '@/servicios/avisoDeAlerta';

/** true si el texto es uno de los tres tipos de alerta de la base. */
function esTipoAlerta(valor: unknown): valor is TipoAlerta {
  return typeof valor === 'string' && valor in NOMBRE_ALERTA;
}

/** P3b · Alerta enviada: confirma con vibración y sonido (RF24). */
export default function AlertaEnviada() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const tipoAlerta: TipoAlerta = esTipoAlerta(tipo) ? tipo : 'seguridad';

  // Una sola vez al llegar a la pantalla: es la confirmación física de que la alerta salió.
  useEffect(() => {
    avisarAlertaEnviada(tipoAlerta);
    // Solo al montar; si cambiara el parámetro no se debe volver a sonar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PantallaMarcador
      id="P3b"
      titulo="Alerta enviada"
      requisitos="RF23"
      enlace={{ texto: 'Volver al inicio', href: '/residente' }}
    />
  );
}

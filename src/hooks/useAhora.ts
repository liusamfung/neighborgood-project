/**
 * useAhora: la hora actual como dato estable para dibujar una pantalla.
 *
 * Qué hace: devuelve el instante (en milisegundos) en que se abrió la pantalla y lo actualiza cada
 * minuto. Sirve para decidir si un aviso está vencido o si una encuesta ya cerró.
 * Por qué existe: un componente de React no debe llamar a `Date.now()` mientras se dibuja (regla
 * `react-hooks/purity`): el resultado cambiaría en cada dibujo. Guardarlo en el estado lo hace
 * estable, y el intervalo lo mantiene al día sin que el usuario recargue.
 * Se usa con: las pestañas Avisos y Encuestas, la pantalla de votar (P5) y la de resultados (P14b).
 */
import { useEffect, useState } from 'react';

// Cada cuánto se actualiza la hora: un minuto basta para vigencias y cierres.
const UN_MINUTO = 60 * 1000;

/** Instante actual en milisegundos (como `Date.now()`), actualizado cada minuto. */
export function useAhora(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), UN_MINUTO);
    return () => clearInterval(intervalo);
  }, []);
  return ahora;
}

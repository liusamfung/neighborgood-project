# RF9 · Un voto por unidad

Relacionado con #19. Integrado por Liu mediante PR #74; issue cerrado. Las pruebas
del HONOR realizadas el 25/11/2026 se describen abajo con sus límites.

## Implementación

- `src/repositorios/votacion.ts`: consulta la encuesta publicada con preguntas/opciones,
  comprueba si la unidad ya votó y llama a la RPC `emitir_voto` existente.
- `src/hooks/useVotacion.ts`: caché separada por usuario, unidad y encuesta. No reintenta
  escrituras automáticamente; vuelve a consultar después de cada intento.
- `src/utilidades/votacion.ts`: plazos, selección única/múltiple, validación de todas las
  preguntas y mensajes sin detalles internos del servidor.
- `src/componentes/encuestas/PreguntaVoto.tsx`: radio/casillas accesibles con el tema común.
- `src/app/residente/encuesta/[id].tsx`: sustituye el marcador P5 por el formulario,
  revisión de respuestas, confirmación, errores y estado «Tu unidad ya votó».

La pantalla no accede directamente a Supabase. La RPC determina usuario y unidad desde
la sesión y realiza la escritura completa en una transacción. El índice único existente
`(encuesta_id, unidad_id)` es la garantía definitiva ante concurrencia; no se sustituye
por un botón deshabilitado. No se modificaron SQL, permisos, tipos generados o dependencias.

## Preparación del 22/11/2026 (histórica)

Antes de aplazar las pruebas se ejecutaron TypeScript, lint y cuatro pruebas de reglas,
sin errores. Esto no acredita la aceptación en Android. Las pruebas de interfaz se
interrumpieron antes de comenzar el recorrido de RF9; no hay evidencia nativa aprobada.

Para la sesión conjunta:

1. Abrir una encuesta sintética de dos preguntas: una única y otra múltiple.
2. Intentar enviar sin responder todo; comprobar que no se registra nada.
3. Cambiar una respuesta única y alternar varias opciones; revisar y cancelar la confirmación.
4. Confirmar el envío y comprobar un solo voto con todas sus opciones en el servidor.
5. Reabrir la encuesta y acceder con otro residente de la misma unidad: ambos ven
   «Tu unidad ya votó»; un segundo envío se rechaza por la restricción del servidor.
6. Probar encuesta cerrada, ajena al sector, doble toque y pérdida de conexión.
7. Retirar exclusivamente las encuestas sintéticas y sus votos al terminar.

Se necesita una segunda cuenta de residente de la misma unidad, coordinada con Liu.
Una segunda sesión del mismo usuario no se presentará como equivalente a dos residentes.
La configuración y los datos de prueba permanecen fuera del repositorio.

## Validación física · 25/11/2026

HONOR CRT-LX3, Android 14, APK local de main `503bcf4`. Se creó por RPC, usando una
cuenta normal de directiva, una encuesta sintética del sector del residente, con una
pregunta simple y otra múltiple. Las respuestas se realizaron desde la interfaz real
del teléfono: formulario incompleto rechazado; selección de A, Lunes y Martes;
revisión, cancelación de la confirmación y confirmación definitiva.

La app mostró «Voto registrado. Tu unidad ya votó en esta encuesta». La API confirmó
un voto de la unidad y tres selecciones agregadas; repetir la RPC con esa misma
cuenta fue rechazado con `23505` y el conteo continuó en uno. Esta repetición por API
no equivale a probar dos residentes distintos de la misma unidad.

Quedan pendientes el segundo residente, la carrera entre dispositivos, el doble
toque y la pérdida de conexión. Las encuestas utilizadas fueron exclusivamente
sintéticas; las credenciales, tokens y capturas privadas no se incorporan al Git.

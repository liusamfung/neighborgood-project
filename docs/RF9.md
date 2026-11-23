# RF9 · Un voto por unidad

Relacionado con #19. Implementación para revisión, pendiente de las pruebas conjuntas
solicitadas por José Eduardo. No se da por aceptado ni integrado el requisito.

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

## Comprobaciones y aceptación pendiente

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

/**
 * CampoFecha: campo para elegir una fecha y una hora con el selector nativo del teléfono.
 *
 * Qué hace: muestra una etiqueta y dos controles, uno para el día y otro para la hora, y entrega un
 * único `Date` que combina ambos. Se usa para la apertura y el cierre de una encuesta (RF8) y servirá
 * para la vigencia de los avisos (RF7).
 * Cómo funciona: en iOS dibuja dos selectores "compact" de `@react-native-community/datetimepicker`
 * (un botón que abre el calendario o la rueda de horas). En Android, que no tiene un selector
 * insertable así, dos botones abren los cuadros de diálogo con `DateTimePickerAndroid.open`.
 * Al cambiar solo el día se conserva la hora, y al cambiar solo la hora se conserva el día.
 * Se usa con: `src/app/directiva/encuestas/nueva.tsx`.
 * Depende de: `@react-native-community/datetimepicker` (módulo nativo: exige reconstruir la
 * development build) y de `src/tema`.
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, radios, tamanos, tipografia } from '@/tema';

/** Datos que recibe el campo de fecha. */
type Props = {
  /** Título del campo, por ejemplo "Abre". */
  etiqueta: string;
  valor: Date;
  /** Se llama con la fecha y hora completas cada vez que el usuario cambia una de las dos. */
  alCambiar: (valor: Date) => void;
  /** Mensaje de error que se muestra debajo del campo. */
  error?: string;
};

/**
 * Une el día de una fecha con la hora de otra.
 *
 * @param dia fecha de la que se toman año, mes y día.
 * @param hora fecha de la que se toman hora y minutos (los segundos quedan en cero).
 */
function combinar(dia: Date, hora: Date): Date {
  return new Date(
    dia.getFullYear(),
    dia.getMonth(),
    dia.getDate(),
    hora.getHours(),
    hora.getMinutes(),
  );
}

/** Día corto para el botón de Android, por ejemplo "10 nov 2026". */
const formatoDia = (fecha: Date) =>
  fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

/** Hora para el botón de Android, por ejemplo "08:30 p. m.". */
const formatoHora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

/** Campo "día + hora" con el selector nativo de cada plataforma. */
export function CampoFecha({ etiqueta, valor, alCambiar, error }: Props) {
  /** Android: abre el diálogo del día o de la hora y combina lo elegido con el valor actual. */
  function abrirAndroid(modo: 'date' | 'time') {
    DateTimePickerAndroid.open({
      value: valor,
      mode: modo,
      onValueChange: (_evento, elegido) =>
        alCambiar(modo === 'date' ? combinar(elegido, valor) : combinar(valor, elegido)),
    });
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.fila}>
        {Platform.OS === 'ios' ? (
          <>
            <DateTimePicker
              accessibilityLabel={`${etiqueta}: día`}
              value={valor}
              mode="date"
              display="compact"
              accentColor={colores.principal}
              onValueChange={(_evento, elegido) => alCambiar(combinar(elegido, valor))}
            />
            <DateTimePicker
              accessibilityLabel={`${etiqueta}: hora`}
              value={valor}
              mode="time"
              display="compact"
              accentColor={colores.principal}
              onValueChange={(_evento, elegido) => alCambiar(combinar(valor, elegido))}
            />
          </>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => abrirAndroid('date')}
              style={estilos.boton}
            >
              <Text style={estilos.textoBoton}>{formatoDia(valor)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => abrirAndroid('time')}
              style={estilos.boton}
            >
              <Text style={estilos.textoBoton}>{formatoHora(valor)}</Text>
            </Pressable>
          </>
        )}
      </View>
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { ...tipografia.subtitulo, color: colores.texto },
  fila: {
    minHeight: tamanos.areaTactilMinima,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boton: {
    minHeight: tamanos.areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    borderRadius: radios.campo,
  },
  textoBoton: { ...tipografia.cuerpo, color: colores.texto },
  error: { ...tipografia.cuerpo, color: colores.peligroTexto },
});

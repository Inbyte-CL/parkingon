package com.inbyte.street.utils

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation

/**
 * Filtra la entrada a solo letras/números en mayúsculas, máximo 6 caracteres.
 * El valor guardado no lleva guion (se muestra con guion solo por VisualTransformation).
 */
fun filterPlateInput(input: String): String =
    input.uppercase().filter { it.isLetterOrDigit() }.take(6)

/**
 * Quita el guion de la patente para enviar al API o comparar (ej. ABCD-12 -> ABCD12).
 */
fun normalizePlate(displayPlate: String): String = displayPlate.replace("-", "")

/**
 * Formatea la patente para mostrar en lista/detalle: XXXX-XX (con guion).
 * Acepta patente con o sin guion y devuelve siempre el formato de visualización.
 */
fun formatPlateForDisplay(plate: String): String {
    val raw = plate.replace("-", "").uppercase().filter { it.isLetterOrDigit() }.take(6)
    return if (raw.length <= 4) raw else raw.take(4) + "-" + raw.drop(4)
}

/**
 * Muestra la patente con guion XXXX-XX solo en pantalla; el valor real no contiene el guion.
 * Así el teclado no recibe cambios de texto constantes y no se dispara autocompletado.
 */
object PlateVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val s = text.text
        val out = if (s.length <= 4) s else s.take(4) + "-" + s.drop(4)
        return TransformedText(
            AnnotatedString(out),
            object : OffsetMapping {
                override fun originalToTransformed(offset: Int): Int =
                    if (offset <= 4) offset else offset + 1
                override fun transformedToOriginal(offset: Int): Int =
                    if (offset <= 4) offset else offset - 1
            }
        )
    }
}

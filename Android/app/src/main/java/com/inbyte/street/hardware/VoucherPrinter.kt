package com.inbyte.street.hardware

import android.content.Context
import android.util.Log
import com.inbyte.street.data.model.Session
import com.inbyte.street.utils.CurrencyUtils
import com.inbyte.street.utils.DateUtils
import com.inbyte.street.utils.formatPlateForDisplay
import com.inbyte.street.utils.formatTariffLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.lang.reflect.InvocationHandler
import java.lang.reflect.Method
import java.lang.reflect.Proxy

/**
 * Impresión de voucher de entrada en impresora térmica Nexgo N96 (SmartPOS SDK).
 * Usa reflexión para invocar el SDK y no fallar en dispositivos sin Nexgo.
 */
object VoucherPrinter {

    private const val TAG = "VoucherPrinter"

    private const val FONT_SMALL  = 16
    private const val FONT_NORMAL = 20
    private const val FONT_LARGE  = 26
    private const val FONT_XLARGE = 36
    private const val FONT_GIANT  = 56   // Placa
    private const val SdkResult_Success = 0
    private const val SEP_HEAVY     = "================================"
    private const val SEP_LIGHT     = "--------------------------------"
    // Barra sólida para el rectángulo de la patente.
    // Se imprime a FONT_XLARGE + bold + LEVEL_4 para máxima solidez y grosor.
    private const val PLATE_SOLID_BAR = "██████████████████████"

    /**
     * Datos opcionales para el encabezado del voucher (organización, parking, tarifa).
     */
    data class VoucherHeader(
        val organizationName: String,
        val parkingName: String,
        val pricePerMinute: Double?,
        val pricingMode: String = "per_minute",
        val segmentAmount: Double? = null,
        val segmentMinutes: Int? = null,
        val operatorName: String? = null
    )

    /**
     * Datos de un pago en efectivo para el comprobante de salida.
     */
    data class CashPaymentData(
        val plate: String,
        val sessionCode: String,
        val entryTime: String,
        val exitTime: String,
        val durationMinutes: Int,
        val amountPaid: Double,
        val amountReceived: Double,
        val changeAmount: Double
    )

    /**
     * Imprime un voucher de prueba. Usar con app en primer plano (botón "Probar impresora").
     */
    suspend fun printTestVoucher(context: Context): Boolean = withContext(Dispatchers.IO) {
        try {
            val engine = getDeviceEngine(context) ?: return@withContext false
            val printer = getPrinter(engine) ?: return@withContext false
            val alignCenter = getAlignEnumCenter(engine) ?: return@withContext false
            var r = initPrinter(printer)
            Log.d(TAG, "printTest: initPrinter=$r")
            if (r != SdkResult_Success) return@withContext false
            r = getStatus(printer)
            Log.d(TAG, "printTest: getStatus=$r (0=OK, PaperLack/TooHot/etc si no)")
            val now = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
            logAppend(printer, "PRUEBA IMPRESORA", FONT_LARGE, alignCenter, true)
            logAppend(printer, now, FONT_NORMAL, alignCenter, false)
            logAppend(printer, "-------------------", FONT_NORMAL, alignCenter, false)
            feedPaper(printer, 80)
            val startR = startPrint(printer, rollPaperEnd = true)
            Log.d(TAG, "printTest: startPrint=$startR (0=OK)")
            startR == SdkResult_Success
        } catch (e: Throwable) {
            Log.e(TAG, "printTest error", e)
            false
        }
    }

    /**
     * Imprime el voucher de entrada con formato profesional.
     */
    suspend fun printEntryVoucher(
        context: Context,
        session: Session,
        header: VoucherHeader? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val engine = getDeviceEngine(context) ?: return@withContext false
            val printer = getPrinter(engine) ?: return@withContext false
            val alignLeft   = getAlignEnumLeft(engine)   ?: return@withContext false
            val alignCenter = getAlignEnumCenter(engine) ?: return@withContext false

            val r = initPrinter(printer)
            Log.d(TAG, "initPrinter result=$r")
            if (r != SdkResult_Success) {
                Log.w(TAG, "initPrinter failed (code=$r)")
                return@withContext false
            }

            val plate     = formatPlateForDisplay(session.normalizedPlate ?: session.plate)
            val code      = session.sessionCode ?: session.id.take(8)
            val entryDate = DateUtils.formatDate(session.entryTime)
            val entryTime = DateUtils.formatTime(session.entryTime)

            // ── ENCABEZADO ────────────────────────────────────────────
            setGray(printer, "LEVEL_4")
            logAppend(printer, SEP_HEAVY, FONT_NORMAL, alignCenter, true)
            setGray(printer, "LEVEL_0")

            if (header != null) {
                logAppend(printer, header.organizationName.uppercase(), FONT_XLARGE, alignCenter, true)
                logAppend(printer, header.parkingName.uppercase(), FONT_LARGE, alignCenter, true)
            }

            setGray(printer, "LEVEL_4")
            logAppend(printer, SEP_HEAVY, FONT_NORMAL, alignCenter, true)
            setGray(printer, "LEVEL_0")

            // ── TÍTULO ────────────────────────────────────────────────
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            logAppend(printer, "COMPROBANTE DE", FONT_XLARGE, alignCenter, true)
            logAppend(printer, "ENTRADA", FONT_XLARGE, alignCenter, true)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            // ── PATENTE (elemento más importante) ────────────────────
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "PATENTE", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)
            // Barra superior sólida
            setGray(printer, "LEVEL_4")
            logAppend(printer, PLATE_SOLID_BAR, FONT_SMALL, alignCenter, true)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            // Placa
            logAppend(printer, plate, FONT_GIANT, alignCenter, true)
            // Barra inferior sólida
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            setGray(printer, "LEVEL_4")
            logAppend(printer, PLATE_SOLID_BAR, FONT_SMALL, alignCenter, true)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)

            // ── DATOS DE LA SESIÓN ────────────────────────────────────
            logAppend(printer, "CODIGO DE SESION", FONT_NORMAL, alignCenter, false)
            logAppend(printer, code, FONT_XLARGE, alignCenter, true)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            setGray(printer, "LEVEL_3")
            logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_0")

            logAppend(printer, "FECHA INGRESO", FONT_NORMAL, alignLeft, false)
            logAppend(printer, "$entryDate   $entryTime", FONT_LARGE, alignLeft, true)

            if (header != null && (header.pricePerMinute != null ||
                        (header.pricingMode == "per_segment" && header.segmentAmount != null))) {
                val tariffLabel = formatTariffLabel(
                    header.pricePerMinute ?: 0.0,
                    header.pricingMode,
                    header.segmentAmount,
                    header.segmentMinutes
                )
                logAppend(printer, "TARIFA", FONT_NORMAL, alignLeft, false)
                logAppend(printer, tariffLabel, FONT_LARGE, alignLeft, true)
            }

            setGray(printer, "LEVEL_3")
            logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            // ── OPERADOR ──────────────────────────────────────────────
            if (!header?.operatorName.isNullOrBlank()) {
                logAppend(printer, "OPERADOR", FONT_NORMAL, alignLeft, false)
                logAppend(printer, header!!.operatorName!!, FONT_LARGE, alignLeft, true)
                setGray(printer, "LEVEL_3")
                logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
                setGray(printer, "LEVEL_0")
                logAppend(printer, "", FONT_SMALL, alignCenter, false)
            }

            // ── PIE ────────────────────────────────────────────────────
            logAppend(printer, "Conserve este comprobante", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "al retirar su vehiculo.", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            setGray(printer, "LEVEL_4")
            logAppend(printer, SEP_HEAVY, FONT_NORMAL, alignCenter, true)
            setGray(printer, "LEVEL_0")

            feedPaper(printer, 100)
            val startR = startPrint(printer, rollPaperEnd = true)
            Log.d(TAG, "startPrint result=$startR")
            if (startR != SdkResult_Success) {
                Log.w(TAG, "startPrint failed: code=$startR")
                return@withContext false
            }
            Log.d(TAG, "Voucher impreso: $plate - $code")
            true
        } catch (e: Throwable) {
            Log.e(TAG, "Error al imprimir voucher", e)
            false
        }
    }

    /**
     * Imprime el comprobante de pago en efectivo.
     */
    suspend fun printCashPaymentVoucher(
        context: Context,
        data: CashPaymentData,
        header: VoucherHeader? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val engine  = getDeviceEngine(context) ?: return@withContext false
            val printer = getPrinter(engine)       ?: return@withContext false
            val alignLeft   = getAlignEnumLeft(engine)   ?: return@withContext false
            val alignCenter = getAlignEnumCenter(engine) ?: return@withContext false

            val r = initPrinter(printer)
            if (r != SdkResult_Success) { Log.w(TAG, "initPrinter failed cash=$r"); return@withContext false }

            val plate     = formatPlateForDisplay(data.plate)
            val entryDate = DateUtils.formatDate(data.entryTime)
            val entryTime = DateUtils.formatTime(data.entryTime)
            val exitDate  = DateUtils.formatDate(data.exitTime)
            val exitTime  = DateUtils.formatTime(data.exitTime)
            val durationText = if (data.durationMinutes < 60)
                "${data.durationMinutes} min"
            else
                "${data.durationMinutes / 60}h ${data.durationMinutes % 60}min"

            // ── ENCABEZADO ────────────────────────────────────────────
            setGray(printer, "LEVEL_4")
            logAppend(printer, SEP_HEAVY, FONT_NORMAL, alignCenter, true)
            setGray(printer, "LEVEL_0")

            if (header != null) {
                logAppend(printer, header.organizationName.uppercase(), FONT_XLARGE, alignCenter, true)
                logAppend(printer, header.parkingName.uppercase(), FONT_LARGE, alignCenter, true)
            }

            setGray(printer, "LEVEL_4")
            logAppend(printer, SEP_HEAVY, FONT_NORMAL, alignCenter, true)
            setGray(printer, "LEVEL_0")

            // ── TÍTULO ────────────────────────────────────────────────
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            logAppend(printer, "COMPROBANTE DE", FONT_XLARGE, alignCenter, true)
            logAppend(printer, "PAGO", FONT_XLARGE, alignCenter, true)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            // ── PATENTE ───────────────────────────────────────────────
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "PATENTE", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_4")
            logAppend(printer, PLATE_SOLID_BAR, FONT_SMALL, alignCenter, true)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            logAppend(printer, plate, FONT_GIANT, alignCenter, true)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            setGray(printer, "LEVEL_4")
            logAppend(printer, PLATE_SOLID_BAR, FONT_SMALL, alignCenter, true)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "", FONT_NORMAL, alignCenter, false)

            // ── CÓDIGO DE SESIÓN ──────────────────────────────────────
            logAppend(printer, "CODIGO DE SESION", FONT_NORMAL, alignCenter, false)
            logAppend(printer, data.sessionCode, FONT_XLARGE, alignCenter, true)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            setGray(printer, "LEVEL_3")
            logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_0")

            // ── TIEMPOS ───────────────────────────────────────────────
            logAppend(printer, "INGRESO", FONT_NORMAL, alignLeft, false)
            logAppend(printer, "$entryDate   $entryTime", FONT_LARGE, alignLeft, true)

            logAppend(printer, "SALIDA", FONT_NORMAL, alignLeft, false)
            logAppend(printer, "$exitDate   $exitTime", FONT_LARGE, alignLeft, true)

            logAppend(printer, "TIEMPO TOTAL", FONT_NORMAL, alignLeft, false)
            logAppend(printer, durationText, FONT_LARGE, alignLeft, true)

            if (header != null && (header.pricePerMinute != null ||
                        (header.pricingMode == "per_segment" && header.segmentAmount != null))) {
                val tariffLabel = formatTariffLabel(
                    header.pricePerMinute ?: 0.0,
                    header.pricingMode,
                    header.segmentAmount,
                    header.segmentMinutes
                )
                logAppend(printer, "TARIFA", FONT_NORMAL, alignLeft, false)
                logAppend(printer, tariffLabel, FONT_LARGE, alignLeft, true)
            }

            setGray(printer, "LEVEL_3")
            logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            // ── MONTOS ────────────────────────────────────────────────
            logAppend(printer, "TOTAL PAGADO", FONT_NORMAL, alignCenter, false)
            logAppend(printer, CurrencyUtils.formatCLP(data.amountPaid), FONT_GIANT, alignCenter, true)

            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            setGray(printer, "LEVEL_3")
            logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_0")

            logAppend(printer, "EFECTIVO RECIBIDO", FONT_NORMAL, alignLeft, false)
            logAppend(printer, CurrencyUtils.formatCLP(data.amountReceived), FONT_LARGE, alignLeft, true)

            if (data.changeAmount > 0) {
                logAppend(printer, "VUELTO", FONT_NORMAL, alignLeft, false)
                logAppend(printer, CurrencyUtils.formatCLP(data.changeAmount), FONT_LARGE, alignLeft, true)
            } else {
                logAppend(printer, "VUELTO", FONT_NORMAL, alignLeft, false)
                logAppend(printer, "$ 0", FONT_LARGE, alignLeft, true)
            }

            setGray(printer, "LEVEL_3")
            logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
            setGray(printer, "LEVEL_0")
            logAppend(printer, "", FONT_SMALL, alignCenter, false)

            // ── OPERADOR ──────────────────────────────────────────────
            if (!header?.operatorName.isNullOrBlank()) {
                logAppend(printer, "OPERADOR", FONT_NORMAL, alignLeft, false)
                logAppend(printer, header!!.operatorName!!, FONT_LARGE, alignLeft, true)
                setGray(printer, "LEVEL_3")
                logAppend(printer, SEP_LIGHT, FONT_NORMAL, alignCenter, false)
                setGray(printer, "LEVEL_0")
                logAppend(printer, "", FONT_SMALL, alignCenter, false)
            }

            // ── PIE ────────────────────────────────────────────────────
            logAppend(printer, "Gracias por su preferencia.", FONT_NORMAL, alignCenter, false)
            logAppend(printer, "", FONT_SMALL, alignCenter, false)
            setGray(printer, "LEVEL_4")
            logAppend(printer, SEP_HEAVY, FONT_NORMAL, alignCenter, true)
            setGray(printer, "LEVEL_0")

            feedPaper(printer, 100)
            val startR = startPrint(printer, rollPaperEnd = true)
            Log.d(TAG, "printCash: startPrint=$startR")
            startR == SdkResult_Success
        } catch (e: Throwable) {
            Log.e(TAG, "Error al imprimir comprobante de pago", e)
            false
        }
    }

    private fun logAppend(printer: Any, text: String, fontsize: Int, align: Any, isBold: Boolean) {
        val r = appendPrnStr(printer, text, fontsize, align, isBold)
        if (r != SdkResult_Success) Log.w(TAG, "appendPrnStr failed: result=$r text=\"$text\"")
    }

    /** Nivel de gris: LEVEL_0 (claro) a LEVEL_4 (más oscuro). Para líneas divisoras más visibles. */
    private fun setGray(printer: Any, levelName: String) {
        try {
            val grayClass = printer.javaClass.classLoader?.loadClass("com.nexgo.oaf.apiv3.device.printer.GrayLevelEnum")
                ?: Class.forName("com.nexgo.oaf.apiv3.device.printer.GrayLevelEnum")
            val level = grayClass.enumConstants?.firstOrNull { it.toString() == levelName }
                ?: grayClass.getField(levelName).get(null)
            val method = printer.javaClass.getMethod("setGray", grayClass)
            method.invoke(printer, level)
        } catch (e: Exception) {
            Log.w(TAG, "setGray($levelName) error (ignored)", e)
        }
    }

    private fun getDeviceEngine(context: Context): Any? {
        return try {
            // SDK real: com.nexgo.oaf.apiv3 (no com.nexgo.smartpos)
            val apiProxy = Class.forName("com.nexgo.oaf.apiv3.APIProxy")
            val method = apiProxy.getMethod("getDeviceEngine", Context::class.java)
            val engine = method.invoke(null, context)
            Log.d(TAG, "getDeviceEngine OK")
            engine
        } catch (e: ClassNotFoundException) {
            Log.w(TAG, "SDK Nexgo no encontrado (clase no en classpath)", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "getDeviceEngine error", e)
            null
        }
    }

    private fun getPrinter(engine: Any): Any? {
        return try {
            val method = engine.javaClass.getMethod("getPrinter")
            val printer = method.invoke(engine)
            Log.d(TAG, "getPrinter OK: ${printer != null}")
            printer
        } catch (e: Exception) {
            Log.e(TAG, "getPrinter error", e)
            null
        }
    }

    private fun getAlignEnumCenter(engine: Any): Any? {
        return try {
            val printer = getPrinter(engine) ?: return null
            getAlignEnumCenterFromPrinter(printer)
        } catch (e: Exception) {
            Log.e(TAG, "AlignEnum.CENTER no encontrado", e)
            null
        }
    }

    private fun getAlignEnumCenterFromPrinter(printer: Any): Any? {
        return getAlignEnumFromPrinter(printer, "CENTER")
    }

    private fun getAlignEnumLeft(engine: Any): Any? {
        return try {
            val printer = getPrinter(engine) ?: return null
            getAlignEnumFromPrinter(printer, "LEFT")
        } catch (e: Exception) {
            Log.e(TAG, "AlignEnum.LEFT no encontrado", e)
            null
        }
    }

    private fun getAlignEnumFromPrinter(printer: Any, name: String): Any? {
        return try {
            val alignClass = printer.javaClass.classLoader?.loadClass("com.nexgo.oaf.apiv3.device.printer.AlignEnum")
                ?: Class.forName("com.nexgo.oaf.apiv3.device.printer.AlignEnum")
            val value = alignClass.enumConstants?.firstOrNull { it.toString() == name }
                ?: alignClass.getField(name).get(null)
            Log.d(TAG, "AlignEnum.$name OK")
            value
        } catch (e: Exception) {
            null
        }
    }

    private fun initPrinter(printer: Any): Int {
        return try {
            val method = printer.javaClass.getMethod("initPrinter")
            (method.invoke(printer) as? Number)?.toInt() ?: -1
        } catch (e: Exception) {
            Log.e(TAG, "initPrinter error", e)
            -1
        }
    }

    private fun appendPrnStr(printer: Any, text: String, fontsize: Int, align: Any, isBold: Boolean): Int {
        return try {
            val alignClass = printer.javaClass.classLoader?.loadClass("com.nexgo.oaf.apiv3.device.printer.AlignEnum")
                ?: Class.forName("com.nexgo.oaf.apiv3.device.printer.AlignEnum")
            val method = printer.javaClass.getMethod(
                "appendPrnStr",
                String::class.java,
                Int::class.javaPrimitiveType,
                alignClass,
                Boolean::class.javaPrimitiveType
            )
            (method.invoke(printer, text, fontsize, align, isBold) as? Number)?.toInt() ?: -1
        } catch (e: Exception) {
            Log.e(TAG, "appendPrnStr error", e)
            -1
        }
    }

    private fun appendQRCode(printer: Any, content: String, height: Int, align: Any): Int {
        return try {
            val alignClass = printer.javaClass.classLoader?.loadClass("com.nexgo.oaf.apiv3.device.printer.AlignEnum")
                ?: Class.forName("com.nexgo.oaf.apiv3.device.printer.AlignEnum")
            val method = printer.javaClass.getMethod(
                "appendQRcode",
                String::class.java,
                Int::class.javaPrimitiveType,
                alignClass
            )
            (method.invoke(printer, content, height, align) as? Number)?.toInt() ?: -1
        } catch (e: Exception) {
            Log.e(TAG, "appendQRcode error", e)
            -1
        }
    }

    private fun getStatus(printer: Any): Int {
        return try {
            val method = printer.javaClass.getMethod("getStatus")
            (method.invoke(printer) as? Number)?.toInt() ?: -1
        } catch (e: Exception) {
            Log.e(TAG, "getStatus error", e)
            -1
        }
    }

    private fun feedPaper(printer: Any, linesPixels: Int = 80) {
        try {
            val method = printer.javaClass.getMethod("feedPaper", Int::class.javaPrimitiveType)
            method.invoke(printer, linesPixels)
        } catch (e: Exception) {
            Log.e(TAG, "feedPaper error", e)
        }
    }

    private fun startPrint(printer: Any, rollPaperEnd: Boolean): Int {
        return try {
            val method = printer.javaClass.methods.firstOrNull { m ->
                m.name == "startPrint" && m.parameterCount == 2 &&
                    m.parameterTypes[0] == Boolean::class.javaPrimitiveType
            }
            if (method != null) {
                // -2 = Param_In_Invalid: el SDK no acepta listener null, hay que pasar un proxy
                val listener = createNoOpPrintListener(printer.javaClass.classLoader)
                (method.invoke(printer, rollPaperEnd, listener) as? Number)?.toInt() ?: -1
            } else {
                Log.e(TAG, "startPrint: no method startPrint(boolean, listener) found")
                -1
            }
        } catch (e: Exception) {
            Log.e(TAG, "startPrint error", e)
            -1
        }
    }

    private fun createNoOpPrintListener(classLoader: ClassLoader?): Any {
        val loader = classLoader ?: javaClass.classLoader
        val listenerClass = loader.loadClass("com.nexgo.oaf.apiv3.device.printer.OnPrintListener")
        return Proxy.newProxyInstance(
            loader,
            arrayOf(listenerClass),
            InvocationHandler { _, method, _ ->
                when (method.returnType.name) {
                    "void" -> null
                    "int" -> 0
                    "boolean" -> false
                    else -> null
                }
            }
        )
    }
}

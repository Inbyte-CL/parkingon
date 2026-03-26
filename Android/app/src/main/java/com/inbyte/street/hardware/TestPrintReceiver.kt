package com.inbyte.street.hardware

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import kotlinx.coroutines.runBlocking

/**
 * Receptor para probar la impresora por ADB:
 *   adb shell am broadcast -a com.inbyte.street.TEST_PRINT
 */
class TestPrintReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ACTION_TEST_PRINT) return
        Thread {
            val ok = runBlocking { VoucherPrinter.printTestVoucher(context.applicationContext) }
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                Toast.makeText(context, if (ok) "Test impreso" else "Falló test impresión", Toast.LENGTH_SHORT).show()
            }
            Log.d(TAG, "Test print result: $ok")
        }.start()
    }

    companion object {
        const val ACTION_TEST_PRINT = "com.inbyte.street.TEST_PRINT"
        private const val TAG = "TestPrintReceiver"
    }
}

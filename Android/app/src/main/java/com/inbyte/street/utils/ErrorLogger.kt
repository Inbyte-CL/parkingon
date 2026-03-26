package com.inbyte.street.utils

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.ArrayDeque

object ErrorLogger {

    private const val TAG = "ErrorLogger"
    private const val PREFS_NAME = "error_logger_prefs"
    private const val PREFS_KEY = "log_entries"
    private const val MAX_ENTRIES = 300

    private const val SUPABASE_URL = "https://mmqqrfvullrovstcykcj.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tcXFyZnZ1bGxyb3ZzdGN5a2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjI4MzYsImV4cCI6MjA4NDc5ODgzNn0.7Dg6tcKkxdM0AHU7b6HnlbKTY8yBXPh2CD9P1uHs3FQ"
    private const val LOGS_TABLE = "app_error_logs"

    enum class Level { INFO, WARNING, ERROR }

    data class LogEntry(
        val timestamp: Long,
        val level: Level,
        val source: String,
        val message: String
    ) {
        val formattedTime: String
            get() = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(Date(timestamp))
    }

    private val buffer = ArrayDeque<LogEntry>(MAX_ENTRIES + 1)
    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs

    private var prefs: SharedPreferences? = null
    private var deviceId: String = "unknown"

    fun init(context: Context) {
        try {
            prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            deviceId = getOrCreateDeviceId(prefs!!)
            loadFromPrefs()
        } catch (e: Exception) {
            Log.e(TAG, "init error", e)
        }
    }

    private fun getOrCreateDeviceId(prefs: SharedPreferences): String {
        val existing = prefs.getString("device_id", null)
        if (!existing.isNullOrBlank()) return existing
        val newId = UUID.randomUUID().toString()
        prefs.edit().putString("device_id", newId).apply()
        return newId
    }

    @Synchronized
    fun log(level: Level, source: String, message: String) {
        try {
            val entry = LogEntry(
                timestamp = System.currentTimeMillis(),
                level = level,
                source = source,
                message = message
            )
            buffer.addLast(entry)
            if (buffer.size > MAX_ENTRIES) buffer.removeFirst()
            _logs.value = buffer.toList().asReversed()
            saveToPrefs()
        } catch (e: Exception) {
            Log.e(TAG, "log error (ignored)", e)
        }
    }

    fun e(source: String, message: String) = log(Level.ERROR, source, message)
    fun w(source: String, message: String) = log(Level.WARNING, source, message)
    fun i(source: String, message: String) = log(Level.INFO, source, message)

    @Synchronized
    fun clear() {
        try {
            buffer.clear()
            _logs.value = emptyList()
            prefs?.edit()?.remove(PREFS_KEY)?.apply()
        } catch (e: Exception) {
            Log.e(TAG, "clear error", e)
        }
    }

    /**
     * Sube todos los logs actuales a Supabase.
     * Retorna Pair(subidos, total) o lanza excepción en caso de error de red.
     */
    suspend fun uploadToSupabase(): Pair<Int, Int> = withContext(Dispatchers.IO) {
        val snapshot = synchronized(this@ErrorLogger) { buffer.toList() }
        if (snapshot.isEmpty()) return@withContext Pair(0, 0)

        val arr = JSONArray()
        snapshot.forEach { entry ->
            arr.put(JSONObject().apply {
                put("timestamp", entry.timestamp)
                put("level", entry.level.name)
                put("source", entry.source)
                put("message", entry.message)
                put("device_id", deviceId)
            })
        }

        val endpoint = URL("$SUPABASE_URL/rest/v1/$LOGS_TABLE")
        val conn = endpoint.openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
            conn.setRequestProperty("Prefer", "return=minimal")
            conn.doOutput = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000

            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(arr.toString()) }

            val code = conn.responseCode
            if (code in 200..299) {
                Log.d(TAG, "uploadToSupabase: ${"${snapshot.size} logs subidos OK (HTTP $code)"}")
                Pair(snapshot.size, snapshot.size)
            } else {
                val body = conn.errorStream?.bufferedReader()?.readText() ?: ""
                throw Exception("HTTP $code: $body")
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun saveToPrefs() {
        try {
            val arr = JSONArray()
            buffer.forEach { entry ->
                arr.put(JSONObject().apply {
                    put("ts", entry.timestamp)
                    put("lvl", entry.level.name)
                    put("src", entry.source)
                    put("msg", entry.message)
                })
            }
            prefs?.edit()?.putString(PREFS_KEY, arr.toString())?.apply()
        } catch (e: Exception) {
            Log.e(TAG, "saveToPrefs error (ignored)", e)
        }
    }

    private fun loadFromPrefs() {
        try {
            val raw = prefs?.getString(PREFS_KEY, null) ?: return
            val arr = JSONArray(raw)
            buffer.clear()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val level = try { Level.valueOf(obj.getString("lvl")) } catch (_: Exception) { Level.INFO }
                buffer.addLast(
                    LogEntry(
                        timestamp = obj.getLong("ts"),
                        level = level,
                        source = obj.getString("src"),
                        message = obj.getString("msg")
                    )
                )
            }
            _logs.value = buffer.toList().asReversed()
        } catch (e: Exception) {
            Log.e(TAG, "loadFromPrefs error (ignored)", e)
        }
    }
}

package com.inbyte.street.ui.navigation

/**
 * Definición de rutas de navegación
 */
sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object OpenShift : Screen("open_shift")
    object CreateSession : Screen("create_session")
    object RegisterExit : Screen("register_exit")
    object ActiveSessions : Screen("active_sessions")
    object ProcessExit : Screen("process_exit/{sessionId}") {
        fun createRoute(sessionId: String) = "process_exit/$sessionId"
    }
    object CreateQuote : Screen("create_quote/{sessionId}") {
        fun createRoute(sessionId: String) = "create_quote/$sessionId"
    }
    object ProcessPayment : Screen("process_payment/{quoteId}") {
        fun createRoute(quoteId: String) = "process_payment/$quoteId"
    }
    object CloseShift : Screen("close_shift")
    object Settings : Screen("settings")
    object Support : Screen("support")
    object ErrorLog : Screen("error_log")
}

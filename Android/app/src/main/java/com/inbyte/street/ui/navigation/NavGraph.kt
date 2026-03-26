package com.inbyte.street.ui.navigation

import android.content.Context
import android.util.Log
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.inbyte.street.MainActivity
import com.inbyte.street.hardware.VoucherPrinter
import com.inbyte.street.ui.screens.*
import com.inbyte.street.ui.viewmodel.AuthViewModel
import com.inbyte.street.ui.viewmodel.ShiftViewModel
import com.inbyte.street.ui.viewmodel.SessionViewModel
import com.inbyte.street.ui.viewmodel.HomeViewModel

/**
 * Grafo de navegación de la aplicación
 */
@Composable
fun NavGraph(
    navController: NavHostController,
    context: Context,
    mainActivity: MainActivity? = null,
    textScale: Float = 1f,
    onTextScaleChange: (Float) -> Unit = {}
) {
    // Mantener las mismas instancias para no recrear ViewModels al volver (evita parpadeo login/main)
    val authViewModel = remember { AuthViewModel(context) }
    val shiftViewModel = remember { ShiftViewModel(context) }
    val sessionViewModel = remember { SessionViewModel(context) }
    val homeViewModel = remember { HomeViewModel(context) }
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState()
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route
    
    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) Screen.Home.route else Screen.Login.route
    ) {
        // Login Screen
        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Home Screen
        composable(Screen.Home.route) {
            // Recargar datos cuando se navega a Home (después de login o al volver)
            LaunchedEffect(Unit) {
                homeViewModel.refresh()
            }
            
            HomeScreen(
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onOpenShift = {
                    navController.navigate(Screen.OpenShift.route)
                },
                onCloseShift = {
                    navController.navigate(Screen.CloseShift.route)
                },
                onCreateSession = {
                    navController.navigate(Screen.CreateSession.route)
                },
                onRegisterExit = {
                    navController.navigate(Screen.RegisterExit.route)
                },
                onViewActiveSessions = {
                    navController.navigate(Screen.ActiveSessions.route)
                },
                onOpenSupport = {
                    navController.navigate(Screen.Support.route)
                },
                onOpenSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                shiftViewModel = shiftViewModel,
                homeViewModel = homeViewModel,
                navController = navController,
                currentRoute = currentRoute,
                textScale = textScale
            )
        }

        // Support Screen (imagen QR / línea de soporte)
        composable(Screen.Support.route) {
            SupportScreen(
                onBack = { navController.popBackStack() },
                currentRoute = currentRoute,
                onNavigateHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onNavigateAutos = {
                    navController.navigate(Screen.ActiveSessions.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onNavigateSettings = {
                    navController.navigate(Screen.Settings.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }

        // Settings Screen
        composable(Screen.Settings.route) {
            SettingsScreen(
                currentTextScale = textScale,
                onTextScaleChange = onTextScaleChange,
                onBack = { navController.popBackStack() },
                currentRoute = currentRoute,
                shiftViewModel = shiftViewModel,
                onNavigateHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onNavigateAutos = {
                    navController.navigate(Screen.ActiveSessions.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onNavigateSupport = {
                    navController.navigate(Screen.Support.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onNavigateSettings = { /* ya en Ajustes */ },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onCloseShift = { navController.navigate(Screen.CloseShift.route) },
                onOpenErrorLog = { navController.navigate(Screen.ErrorLog.route) }
            )
        }

        composable(Screen.ErrorLog.route) {
            ErrorLogScreen(onBack = { navController.popBackStack() })
        }
        
        // Open Shift Screen
        composable(Screen.OpenShift.route) {
            OpenShiftScreen(
                viewModel = shiftViewModel,
                onBack = { navController.popBackStack() },
                onShiftOpened = {
                    navController.popBackStack()
                }
            )
        }
        
        // Close Shift Screen
        composable(Screen.CloseShift.route) {
            CloseShiftScreen(
                viewModel = shiftViewModel,
                onBack = { navController.popBackStack() },
                onShiftClosed = {
                    navController.popBackStack()
                }
            )
        }
        
        // Create Session Screen
        composable(Screen.CreateSession.route) {
            CreateSessionScreen(
                viewModel = sessionViewModel,
                onBack = { navController.popBackStack() },
                onSessionCreated = {
                    navController.popBackStack()
                }
            )
        }
        
        // Register Exit Screen
        composable(Screen.RegisterExit.route) {
            RegisterExitScreen(
                viewModel = sessionViewModel,
                onBack = { navController.popBackStack() },
                onExitRegistered = {
                    navController.popBackStack()
                },
                onProcessExit = { sessionId ->
                    navController.navigate(Screen.ProcessExit.createRoute(sessionId))
                }
            )
        }
        
        // Active Sessions Screen
        composable(Screen.ActiveSessions.route) {
            ActiveSessionsScreen(
                viewModel = sessionViewModel,
                onBack = { navController.popBackStack() },
                onProcessExit = { sessionId ->
                    navController.navigate(Screen.ProcessExit.createRoute(sessionId))
                },
                onNewEntry = {
                    navController.navigate(Screen.CreateSession.route)
                },
                currentRoute = currentRoute,
                shiftViewModel = shiftViewModel,
                onNavigateHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onNavigateAutos = { /* ya en Autos */ },
                onNavigateSupport = {
                    navController.navigate(Screen.Support.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onNavigateSettings = {
                    navController.navigate(Screen.Settings.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onCloseShift = { navController.navigate(Screen.CloseShift.route) }
            )
        }
        
        // Process Exit Screen (pantalla completa para salida)
        composable(
            route = "process_exit/{sessionId}",
            arguments = listOf(
                androidx.navigation.navArgument("sessionId") { 
                    type = androidx.navigation.NavType.StringType 
                }
            )
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getString("sessionId") ?: ""
            
            // Mantener la sesión y precio en memoria
            var cachedSession by remember { 
                mutableStateOf<com.inbyte.street.data.model.SessionWithDuration?>(null) 
            }
            var cachedPricePerMinute by remember { mutableStateOf(0.0) }
            var cachedMaxDailyAmount by remember { mutableStateOf<Double?>(null) }
            var cachedPricingMode by remember { mutableStateOf("per_minute") }
            var cachedSegmentAmount by remember { mutableStateOf<Double?>(null) }
            var cachedSegmentMinutes by remember { mutableStateOf<Int?>(null) }
            
            // Obtener la sesión desde el ViewModel solo una vez
            val uiState by sessionViewModel.uiState.collectAsState()
            
            // Cargar sesiones si no están cargadas y no tenemos la sesión en caché
            androidx.compose.runtime.LaunchedEffect(sessionId) {
                if (cachedSession == null) {
                    sessionViewModel.getActiveSessions()
                }
            }
            
            // Guardar la sesión en caché cuando se carga
            androidx.compose.runtime.LaunchedEffect(uiState, sessionId) {
                if (uiState is com.inbyte.street.ui.viewmodel.SessionUiState.ActiveSessionsLoaded && cachedSession == null) {
                    val response = (uiState as com.inbyte.street.ui.viewmodel.SessionUiState.ActiveSessionsLoaded).response
                    val session = response.sessions.find { it.id == sessionId }
                    if (session != null) {
                        cachedSession = session
                        cachedPricePerMinute = response.pricePerMinute ?: 0.0
                        cachedMaxDailyAmount = response.maxDailyAmount
                        cachedPricingMode = response.pricingMode ?: "per_minute"
                        cachedSegmentAmount = response.segmentAmount
                        cachedSegmentMinutes = response.segmentMinutes
                        Log.d("NavGraph", "✅ Sesión guardada en caché: ${session.plate}")
                    }
                }
            }
            
            // Construir VoucherHeader desde userInfo para imprimir el comprobante de pago
            val userInfo by homeViewModel.userInfo.collectAsState()
            val voucherHeader = userInfo?.let { info ->
                VoucherPrinter.VoucherHeader(
                    organizationName = info.organizationName,
                    parkingName = info.parkingName,
                    pricePerMinute = info.pricePerMinute,
                    pricingMode = info.pricingMode,
                    segmentAmount = info.segmentAmount,
                    segmentMinutes = info.segmentMinutes,
                    operatorName = info.displayName
                )
            }

            // Mostrar la pantalla si tenemos la sesión en caché
            if (cachedSession != null) {
                ProcessExitScreen(
                    session = cachedSession!!,
                    pricePerMinute = cachedPricePerMinute,
                    maxDailyAmount = cachedMaxDailyAmount,
                    pricingMode = cachedPricingMode,
                    segmentAmount = cachedSegmentAmount,
                    segmentMinutes = cachedSegmentMinutes,
                    voucherHeader = voucherHeader,
                    viewModel = sessionViewModel,
                    mainActivity = mainActivity,
                    onBack = { navController.popBackStack() },
                    onExitProcessed = {
                        mainActivity?.clearCardPaymentResult()
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                        }
                    }
                )
            } else {
                // Mostrar loading mientras se cargan las sesiones
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}

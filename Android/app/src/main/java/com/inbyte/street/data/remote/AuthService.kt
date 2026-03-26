package com.inbyte.street.data.remote

import com.inbyte.street.data.model.User
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email

/**
 * Servicio de autenticación con Supabase
 */
class AuthService {
    
    private val supabase = SupabaseClientProvider.client
    
    /**
     * Login con email y password
     */
    suspend fun login(email: String, password: String): Result<User> {
        return try {
            supabase.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            
            val session = supabase.auth.currentSessionOrNull()
            val user = supabase.auth.currentUserOrNull()
            
            if (session != null && user != null) {
                Result.success(
                    User(
                        id = user.id,
                        email = user.email ?: email
                    )
                )
            } else {
                Result.failure(Exception("Error al obtener sesión"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Logout
     */
    suspend fun logout(): Result<Unit> {
        return try {
            supabase.auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Obtener usuario actual
     */
    suspend fun getCurrentUser(): User? {
        return try {
            val user = supabase.auth.currentUserOrNull()
            user?.let {
                User(
                    id = it.id,
                    email = it.email ?: ""
                )
            }
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Obtener token de sesión actual
     */
    suspend fun getCurrentToken(): String? {
        return try {
            supabase.auth.currentAccessTokenOrNull()
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Verificar si hay sesión activa
     */
    fun isLoggedIn(): Boolean {
        return supabase.auth.currentSessionOrNull() != null
    }
}

package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Modelo para memberships (relación usuario-organización-parking)
 */
@Serializable
data class Membership(
    @SerialName("id")
    val id: String,
    
    @SerialName("org_id")
    val orgId: String,
    
    @SerialName("user_id")
    val userId: String,
    
    @SerialName("parking_id")
    val parkingId: String? = null,
    
    @SerialName("role")
    val role: String,
    
    @SerialName("status")
    val status: String,
    
    @SerialName("display_name")
    val displayName: String? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null
)

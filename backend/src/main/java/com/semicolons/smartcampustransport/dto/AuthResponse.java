package com.semicolons.smartcampustransport.dto;

/**
 * Response DTO for authentication.
 * Contains JWT token and user info.
 */
public record AuthResponse(
    String token,
    String email,
    String role
) {}

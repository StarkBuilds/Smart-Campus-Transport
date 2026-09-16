package com.semicolons.smartcampustransport.dto;

/**
 * Request DTO for direct authentication/token generation.
 * Used for testing and bus device authentication.
 */
public record AuthRequest(
    String email,
    String password
) {}

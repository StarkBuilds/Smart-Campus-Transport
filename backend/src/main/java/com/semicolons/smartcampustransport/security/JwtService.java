package com.semicolons.smartcampustransport.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;

/**
 * Service for generating and validating JWT tokens.
 *
 * Used for API authorization after OAuth2 login.
 */
@Component
@Slf4j
public class JwtService {

    @Value("${jwt.secret:default-secret-key-change-in-production-must-be-at-least-256-bits-long}")
    private String jwtSecret;

    @Value("${jwt.expiration-hours:24}")
    private int expirationHours;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate JWT token for an authenticated user.
     *
     * @param email the user's email
     * @param role the user's role (STUDENT, ADMIN)
     * @return signed JWT token
     */
    public String generateToken(String email, String role) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expirationHours, ChronoUnit.HOURS);

        return Jwts.builder()
            .subject(email)
            .claim("role", role)
            .claim("roles", List.of("ROLE_" + role))
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(getSigningKey())
            .compact();
    }

    /**
     * Validate JWT token and extract email.
     *
     * @param token the JWT token
     * @return email if valid, null otherwise
     */
    public String validateTokenAndGetEmail(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

            return claims.getSubject();
        } catch (Exception e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extract role from JWT token.
     *
     * @param token the JWT token
     * @return role string (e.g., "STUDENT", "ADMIN")
     */
    public String getRoleFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

            return claims.get("role", String.class);
        } catch (Exception e) {
            log.error("Error extracting role from JWT: {}", e.getMessage());
            return null;
        }
    }
}

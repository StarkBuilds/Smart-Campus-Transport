package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Application user entity.
 * Supports OAuth2 login (Google, GitHub) with JWT-based authorization.
 */
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email", unique = true),
    @Index(name = "idx_user_provider", columnList = "provider, provider_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "picture_url")
    private String pictureUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Builder.Default
    private Role role = Role.STUDENT;

    /**
     * OAuth2 provider: google or github
     */
    @Column(name = "provider", nullable = false)
    private String provider;

    /**
     * User ID from the OAuth2 provider
     */
    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    public enum Role {
        STUDENT,
        ADMIN
    }
}

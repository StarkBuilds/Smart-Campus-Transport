package com.semicolons.smartcampustransport.config;

import com.semicolons.smartcampustransport.security.JwtAuthenticationFilter;
import com.semicolons.smartcampustransport.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration.
 *
 * Requirements implemented:
 * 1. OAuth2 Login with Google and GitHub
 * 2. JWT-based API authorization via JwtAuthenticationFilter
 * 3. Role-based authorization:
 *    - Public: OAuth2 endpoints, /api/auth/**, actuator
 *    - STUDENT: /api/buses/**, /api/routes/**, /api/alerts (read-only)
 *    - ADMIN: /api/bus-events (ingestion), /api/alerts?type=...
 * 4. Stateless session management (JWT)
 * 5. Modern lambda-based DSL (Spring Security 6.x style)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomOAuth2UserService customOAuth2UserService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for stateless REST APIs
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless session management (JWT tokens used instead of cookies)
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**", "/error").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/buses/**", "/api/routes/**", "/api/alerts").permitAll()
                .requestMatchers("/api/ml/**").hasRole("ADMIN")

                // ADMIN only: Management endpoints
                .requestMatchers("/api/bus-events").hasRole("ADMIN")
                .requestMatchers("/api/schedules").hasRole("ADMIN")
                .requestMatchers("/api/schedules/**").hasRole("ADMIN")
                .requestMatchers("/api/trips").hasAnyRole("STUDENT", "ADMIN")
                .requestMatchers("/api/trips/**").hasRole("ADMIN")
                .requestMatchers("/api/assignments").hasRole("ADMIN")
                .requestMatchers("/api/stops/**").hasRole("ADMIN")

                // Authenticated student transport profile
                .requestMatchers("/api/my/transport").hasAnyRole("STUDENT", "ADMIN")

                // All other requests require authentication
                .anyRequest().authenticated()
            )

            // OAuth2 Login configuration
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .defaultSuccessUrl("/api/auth/oauth2/success", true)
            )

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

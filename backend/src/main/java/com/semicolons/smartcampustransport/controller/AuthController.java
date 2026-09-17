package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.AuthRequest;
import com.semicolons.smartcampustransport.dto.AuthResponse;
import com.semicolons.smartcampustransport.entity.User;
import com.semicolons.smartcampustransport.repository.UserRepository;
import com.semicolons.smartcampustransport.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for authentication endpoints.
 *
 * Endpoints:
 * - POST /api/auth/token: Issue JWT token for testing/direct login
 * - GET /api/auth/me: Get current user info from JWT
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    /**
     * Issue a JWT token for testing/direct authentication.
     * In production, users will login via OAuth2, but this endpoint is useful for:
     * 1. Bus devices (which can't do OAuth2 flows)
     * 2. Integration testing
     * 3. Admin CLI tools
     */
    @PostMapping("/token")
    public ResponseEntity<AuthResponse> generateToken(@RequestBody AuthRequest request) {
        log.info("Token request for email: {}", request.email());

        // For MVP/testing: If user exists, use their role. Otherwise create STUDENT user.
        User user = userRepository.findByEmail(request.email())
            .orElseGet(() -> {
                User newUser = User.builder()
                    .email(request.email())
                    .name(request.email().split("@")[0])
                    .provider("local")
                    .providerId(request.email())
                    .role(User.Role.STUDENT)
                    .build();
                return userRepository.save(newUser);
            });

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        return ResponseEntity.ok(new AuthResponse(
            token,
            user.getEmail(),
            user.getRole().name()
        ));
    }
}

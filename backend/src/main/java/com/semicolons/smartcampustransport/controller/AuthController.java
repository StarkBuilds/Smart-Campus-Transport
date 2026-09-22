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
import com.semicolons.smartcampustransport.dto.RegistrationRequest;
import com.semicolons.smartcampustransport.dto.RegistrationResponse;
import com.semicolons.smartcampustransport.service.AssignmentService;
import com.semicolons.smartcampustransport.dto.AssignmentResponse;

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
    private final AssignmentService assignmentService;

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

    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(@RequestBody RegistrationRequest request) {
        log.info("Registration request for email: {} with role: {}", request.email(), request.role());

        if (userRepository.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body(new RegistrationResponse(
                null, request.email(), null, null, "Email already registered", null, null, null, null
            ));
        }

        User.Role role = "DRIVER".equalsIgnoreCase(request.role()) ? User.Role.DRIVER : User.Role.STUDENT;

        // Role-specific validation
        if (role == User.Role.STUDENT) {
            if (request.pickupLatitude() == null || request.pickupLongitude() == null) {
                return ResponseEntity.badRequest().body(new RegistrationResponse(
                    null, request.email(), null, null, "Student registration requires pickup coordinates", null, null, null, null
                ));
            }
        } else {
            if (request.driverId() == null || request.driverId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(new RegistrationResponse(
                    null, request.email(), null, null, "Driver registration requires a Driver ID", null, null, null, null
                ));
            }
        }

        User user = User.builder()
            .email(request.email())
            .name(request.name())
            .provider("local")
            .providerId(request.email())
            .role(role)
            .password(request.password())
            .campus(request.campus())
            .build();

        if (role == User.Role.STUDENT) {
            user.setPickupLatitude(request.pickupLatitude());
            user.setPickupLongitude(request.pickupLongitude());
        } else {
            user.setDriverId(request.driverId());
            user.setAssignedBusId(request.assignedBusId());
            user.setAssignedRouteId(request.assignedRouteId());
        }

        User savedUser = userRepository.save(user);

        String assignedRouteId = null;
        String assignedStopId = null;
        String assignedRouteName = null;
        String assignedStopName = null;

        if (role == User.Role.STUDENT && request.pickupLatitude() != null && request.pickupLongitude() != null) {
            try {
                AssignmentResponse assignment = assignmentService.autoAssignStudent(
                    savedUser.getId(), request.campus(), request.pickupLatitude(), request.pickupLongitude()
                );
                assignedRouteId = assignment.routeId();
                assignedStopId = assignment.pickupStopId();
                assignedRouteName = assignment.routeName();
                assignedStopName = assignment.pickupStopName();
            } catch (Exception e) {
                log.error("Failed to auto-assign student: {}", e.getMessage());
            }
        }

        String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().name());

        return ResponseEntity.ok(new RegistrationResponse(
            token,
            savedUser.getEmail(),
            savedUser.getRole().name(),
            savedUser.getName(),
            "Registration successful",
            assignedRouteId,
            assignedStopId,
            assignedRouteName,
            assignedStopName
        ));
    }
}

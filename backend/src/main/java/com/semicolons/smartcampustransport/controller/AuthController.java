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
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;

import java.util.List;

/**
 * Controller for authentication endpoints.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AssignmentService assignmentService;
    private final RouteStopRepository routeStopRepository;

    @PostMapping("/token")
    public ResponseEntity<?> generateToken(@RequestBody AuthRequest request) {
        log.info("Token request for email: {}", request.email());

        // Support for creating the standard demo admin immediately
        if ("admin@campusride.edu".equalsIgnoreCase(request.email())) {
            User admin = userRepository.findByEmail(request.email()).orElseGet(() -> {
                User newAdmin = User.builder()
                        .email(request.email())
                        .name("System Admin")
                        .provider("local")
                        .providerId(request.email())
                        .role(User.Role.ADMIN)
                        .password("admin123")
                        .build();
                return userRepository.save(newAdmin);
            });
            if (request.password() != null && !request.password().equals(admin.getPassword())) {
                return ResponseEntity.status(401).body("Invalid credentials");
            }
            String token = jwtService.generateToken(admin.getEmail(), admin.getRole().name());
            return ResponseEntity.ok(new AuthResponse(token, admin.getEmail(), admin.getRole().name()));
        }

        User user = userRepository.findByEmail(request.email())
            .orElseGet(() -> {
                User newUser = User.builder()
                    .email(request.email())
                    .name(request.email().split("@")[0])
                    .provider("local")
                    .providerId(request.email())
                    .role(User.Role.STUDENT)
                    .password(request.password())
                    .build();
                return userRepository.save(newUser);
            });

        // Simple password check for MVP
        if (request.password() != null && user.getPassword() != null && !request.password().equals(user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getRole().name()));
    }

    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(@RequestBody RegistrationRequest request) {
        log.info("Registration request for email: {} with role: {}", request.email(), request.role());

        if (userRepository.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body(new RegistrationResponse(
                null, request.email(), null, null, "Email already registered", null, null, null, null
            ));
        }

        User.Role role = "DRIVER".equalsIgnoreCase(request.role()) ? User.Role.DRIVER : 
                         ("ADMIN".equalsIgnoreCase(request.role()) ? User.Role.ADMIN : User.Role.STUDENT);

        if (role == User.Role.STUDENT) {
            if (request.assignedRouteId() == null || request.assignedStopId() == null) {
                return ResponseEntity.badRequest().body(new RegistrationResponse(
                    null, request.email(), null, null, "Student registration requires route and stop", null, null, null, null
                ));
            }
        } else if (role == User.Role.DRIVER) {
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
            user.setAssignedRouteId(request.assignedRouteId());
        } else if (role == User.Role.DRIVER) {
            user.setDriverId(request.driverId());
            user.setAssignedBusId(request.assignedBusId());
            user.setAssignedRouteId(request.assignedRouteId());
        }

        User savedUser = userRepository.save(user);

        String assignedRouteId = null;
        String assignedStopId = null;
        String assignedRouteName = null;
        String assignedStopName = null;

        if (role == User.Role.STUDENT) {
            try {
                List<RouteStop> stops = routeStopRepository.findByRouteIdOrderBySequenceOrder(request.assignedRouteId());
                if (!stops.isEmpty()) {
                    String dropoffStopId = stops.get(stops.size() - 1).getStop().getStopId();
                    AssignmentResponse assignment = assignmentService.createAssignment(
                        savedUser.getId(), request.assignedRouteId(), request.assignedStopId(), dropoffStopId, "2024-FALL"
                    );
                    assignedRouteId = assignment.routeId();
                    assignedStopId = assignment.pickupStopId();
                    assignedRouteName = assignment.routeName();
                    assignedStopName = assignment.pickupStopName();
                }
            } catch (Exception e) {
                log.error("Failed to assign student: {}", e.getMessage());
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

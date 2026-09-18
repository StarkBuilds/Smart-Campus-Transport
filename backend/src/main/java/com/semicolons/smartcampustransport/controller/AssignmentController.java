package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.AssignmentResponse;
import com.semicolons.smartcampustransport.dto.MyTransportResponse;
import com.semicolons.smartcampustransport.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for student transport assignments and personalized views.
 *
 * Endpoints:
 * - GET /api/my/transport: Get logged-in student's transport details (STUDENT)
 * - POST /api/assignments: Assign a student to a transport route/stop (ADMIN)
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    /**
     * Get the logged-in student's transport assignments, route, and stops.
     * Auth: STUDENT and ADMIN
     */
    @GetMapping("/my/transport")
    public ResponseEntity<MyTransportResponse> getMyTransport(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(assignmentService.getMyTransport(email));
    }

    /**
     * Request DTO for creating an assignment.
     */
    public record CreateAssignmentRequest(
        Long userId,
        String routeId,
        String pickupStopId,
        String dropoffStopId,
        String semester
    ) {}

    /**
     * Create a student transport assignment (Admin only).
     */
    @PostMapping("/assignments")
    public ResponseEntity<AssignmentResponse> createAssignment(
            @RequestBody CreateAssignmentRequest request) {
        AssignmentResponse response = assignmentService.createAssignment(
            request.userId(),
            request.routeId(),
            request.pickupStopId(),
            request.dropoffStopId(),
            request.semester()
        );
        return ResponseEntity.ok(response);
    }
}

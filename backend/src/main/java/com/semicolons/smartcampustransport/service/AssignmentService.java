package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.AssignmentResponse;
import com.semicolons.smartcampustransport.dto.MyTransportResponse;
import com.semicolons.smartcampustransport.entity.Route;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.entity.StudentTransportAssignment;
import com.semicolons.smartcampustransport.entity.User;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import com.semicolons.smartcampustransport.repository.StopRepository;
import com.semicolons.smartcampustransport.repository.StudentTransportAssignmentRepository;
import com.semicolons.smartcampustransport.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing student transport assignments.
 *
 * Implements:
 * - Assigning students to routes and pickup/dropoff stops
 * - Fetching personalized transport information for a student (/api/my/transport)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AssignmentService {

    private final StudentTransportAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final RouteStopRepository routeStopRepository;

    /**
     * Get all active assignments for a user by email.
     */
    public MyTransportResponse getMyTransport(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        List<StudentTransportAssignment> assignments =
            assignmentRepository.findByUserIdAndActiveTrue(user.getId());

        List<MyTransportResponse.AssignmentInfo> assignmentInfos = new ArrayList<>();

        for (StudentTransportAssignment assignment : assignments) {
            Route route = routeRepository.findByRouteId(assignment.getRouteId()).orElse(null);
            Stop pickup = stopRepository.findByStopId(assignment.getPickupStopId()).orElse(null);
            Stop dropoff = stopRepository.findByStopId(assignment.getDropoffStopId()).orElse(null);

            // Get stop offsets
            Integer pickupOffset = null;
            Integer pickupSeq = null;
            if (pickup != null) {
                Optional<RouteStop> rs = routeStopRepository.findByRouteIdAndStopId(
                    assignment.getRouteId(), assignment.getPickupStopId());
                if (rs.isPresent()) {
                    pickupOffset = rs.get().getArrivalOffsetMinutes();
                    pickupSeq = rs.get().getSequenceOrder();
                }
            }

            Integer dropoffOffset = null;
            Integer dropoffSeq = null;
            if (dropoff != null) {
                Optional<RouteStop> rs = routeStopRepository.findByRouteIdAndStopId(
                    assignment.getRouteId(), assignment.getDropoffStopId());
                if (rs.isPresent()) {
                    dropoffOffset = rs.get().getArrivalOffsetMinutes();
                    dropoffSeq = rs.get().getSequenceOrder();
                }
            }

            MyTransportResponse.StopInfo pickupInfo = pickup != null ?
                new MyTransportResponse.StopInfo(
                    pickup.getStopId(),
                    pickup.getName(),
                    pickup.getLatitude(),
                    pickup.getLongitude(),
                    pickupSeq,
                    pickupOffset
                ) : null;

            MyTransportResponse.StopInfo dropoffInfo = dropoff != null ?
                new MyTransportResponse.StopInfo(
                    dropoff.getStopId(),
                    dropoff.getName(),
                    dropoff.getLatitude(),
                    dropoff.getLongitude(),
                    dropoffSeq,
                    dropoffOffset
                ) : null;

            assignmentInfos.add(new MyTransportResponse.AssignmentInfo(
                assignment.getAssignmentId(),
                assignment.getRouteId(),
                route != null ? route.getName() : null,
                route != null ? route.getColor() : null,
                pickupInfo,
                dropoffInfo,
                assignment.getSemester(),
                assignment.getActive()
            ));
        }

        return new MyTransportResponse(user.getId(), user.getEmail(), assignmentInfos);
    }

    /**
     * Create a new student transport assignment (Admin only).
     */
    @Transactional
    public AssignmentResponse createAssignment(
        Long userId,
        String routeId,
        String pickupStopId,
        String dropoffStopId,
        String semester
    ) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Unknown user ID: " + userId);
        }
        if (!routeRepository.existsById(routeId)) {
            throw new IllegalArgumentException("Unknown route ID: " + routeId);
        }
        if (!stopRepository.existsById(pickupStopId)) {
            throw new IllegalArgumentException("Unknown pickup stop ID: " + pickupStopId);
        }
        if (!stopRepository.existsById(dropoffStopId)) {
            throw new IllegalArgumentException("Unknown dropoff stop ID: " + dropoffStopId);
        }

        // Verify stops belong to route
        routeStopRepository.findByRouteIdAndStopId(routeId, pickupStopId)
            .orElseThrow(() -> new IllegalArgumentException("Pickup stop " + pickupStopId + " is not on route " + routeId));

        routeStopRepository.findByRouteIdAndStopId(routeId, dropoffStopId)
            .orElseThrow(() -> new IllegalArgumentException("Dropoff stop " + dropoffStopId + " is not on route " + routeId));

        StudentTransportAssignment assignment = StudentTransportAssignment.builder()
            .userId(userId)
            .routeId(routeId)
            .pickupStopId(pickupStopId)
            .dropoffStopId(dropoffStopId)
            .semester(semester)
            .active(true)
            .build();

        StudentTransportAssignment saved = assignmentRepository.save(assignment);
        log.info("Created transport assignment for user {} on route {}", userId, routeId);

        return AssignmentResponse.from(saved);
    }
}

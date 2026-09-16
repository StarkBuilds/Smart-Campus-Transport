package com.semicolons.smartcampustransport.dto;

import java.util.List;

/**
 * Response DTO for a student's transport information.
 * Returned by GET /api/my/transport
 */
public record MyTransportResponse(
    Long userId,
    String userEmail,
    List<AssignmentInfo> assignments
) {
    public record AssignmentInfo(
        Long assignmentId,
        String routeId,
        String routeName,
        String routeColor,
        StopInfo pickupStop,
        StopInfo dropoffStop,
        String semester,
        Boolean active
    ) {}

    public record StopInfo(
        String stopId,
        String name,
        Double latitude,
        Double longitude,
        Integer sequenceOrder,
        Integer arrivalOffsetMinutes
    ) {}
}

package com.semicolons.smartcampustransport.dto;

import com.semicolons.smartcampustransport.entity.StudentTransportAssignment;

/**
 * Response DTO for StudentTransportAssignment entity.
 */
public record AssignmentResponse(
    Long assignmentId,
    Long userId,
    String routeId,
    String routeName,
    String pickupStopId,
    String pickupStopName,
    String dropoffStopId,
    String dropoffStopName,
    String semester,
    Boolean active
) {
    public static AssignmentResponse from(StudentTransportAssignment assignment) {
        return new AssignmentResponse(
            assignment.getAssignmentId(),
            assignment.getUserId(),
            assignment.getRouteId(),
            assignment.getRoute() != null ? assignment.getRoute().getName() : null,
            assignment.getPickupStopId(),
            assignment.getPickupStop() != null ? assignment.getPickupStop().getName() : null,
            assignment.getDropoffStopId(),
            assignment.getDropoffStop() != null ? assignment.getDropoffStop().getName() : null,
            assignment.getSemester(),
            assignment.getActive()
        );
    }
}

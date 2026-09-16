package com.semicolons.smartcampustransport.dto;

import com.semicolons.smartcampustransport.entity.Alert;

import java.time.Instant;

/**
 * Response DTO for alerts.
 */
public record AlertResponse(
    Long id,
    String busId,
    String routeId,
    String type,
    String status,
    String message,
    Instant timestamp,
    Instant resolvedAt
) {
    public static AlertResponse from(Alert alert) {
        return new AlertResponse(
            alert.getId(),
            alert.getBusId(),
            alert.getRouteId(),
            alert.getType().name(),
            alert.getStatus().name(),
            alert.getMessage(),
            alert.getTimestamp(),
            alert.getResolvedAt()
        );
    }
}

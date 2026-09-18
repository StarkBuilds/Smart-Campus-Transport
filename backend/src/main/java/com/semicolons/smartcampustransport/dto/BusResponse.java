package com.semicolons.smartcampustransport.dto;

import lombok.Builder;

import java.time.Instant;

/**
 * Response DTO for bus queries.
 * Includes resolved stop information for frontend convenience.
 */
@Builder
public record BusResponse(
    String busId,
    String status,
    String routeId,
    String currentTripId,
    Double latestLatitude,
    Double latestLongitude,
    Instant latestTimestamp,
    Double latestSpeedKmh,
    Double bearing,
    StopInfo nextStop
) {
    /**
     * Lightweight location-only response for frequent polling.
     */
    public record BusLocation(
        String busId,
        Double latitude,
        Double longitude,
        Instant timestamp,
        Double speedKmh,
        Double bearing
    ) {}
}

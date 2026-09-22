package com.semicolons.smartcampustransport.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

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
    StopInfo currentStop,
    StopInfo nextStop,
    List<StopInfo> upcomingStops,
    Integer etaMinutes,
    Integer delayMinutes
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

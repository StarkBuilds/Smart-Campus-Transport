package com.semicolons.smartcampustransport.dto;

/**
 * Stop information included in bus and route responses.
 * Uses offset-based scheduling: arrivalOffsetMinutes is relative to the route's departure time.
 */
public record StopInfo(
    String stopId,
    String name,
    Double latitude,
    Double longitude,
    Integer sequenceOrder,
    Integer arrivalOffsetMinutes
) {
    // Constructor for stops without sequence order (e.g., next stop in BusResponse)
    public StopInfo(String stopId, String name, Double latitude, Double longitude) {
        this(stopId, name, latitude, longitude, null, null);
    }
}

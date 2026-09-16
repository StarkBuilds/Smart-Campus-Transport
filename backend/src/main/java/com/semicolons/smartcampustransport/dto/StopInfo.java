package com.semicolons.smartcampustransport.dto;

import java.time.LocalTime;

/**
 * Stop information included in bus and route responses.
 */
public record StopInfo(
    String stopId,
    String name,
    Double latitude,
    Double longitude,
    Integer sequenceOrder,
    LocalTime scheduledArrivalTime
) {
    // Constructor for stops without sequence order (e.g., next stop in BusResponse)
    public StopInfo(String stopId, String name, Double latitude, Double longitude) {
        this(stopId, name, latitude, longitude, null, null);
    }
}

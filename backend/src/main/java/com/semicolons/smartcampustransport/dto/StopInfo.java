package com.semicolons.smartcampustransport.dto;

/**
 * Stop information included in bus and route responses.
 * Uses offset-based scheduling: arrivalOffsetMinutes is relative to the route's departure time.
 * liveEtaMinutes is optional and filled by the live road-distance ETA pipeline when available.
 */
public record StopInfo(
    String stopId,
    String name,
    Double latitude,
    Double longitude,
    Integer sequenceOrder,
    Integer arrivalOffsetMinutes,
    Integer liveEtaMinutes
) {
    public StopInfo(String stopId, String name, Double latitude, Double longitude) {
        this(stopId, name, latitude, longitude, null, null, null);
    }

    public StopInfo(String stopId, String name, Double latitude, Double longitude,
                    Integer sequenceOrder, Integer arrivalOffsetMinutes) {
        this(stopId, name, latitude, longitude, sequenceOrder, arrivalOffsetMinutes, null);
    }
}

package com.semicolons.smartcampustransport.dto;

import com.semicolons.smartcampustransport.entity.Trip;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Response DTO for Trip entity.
 */
public record TripResponse(
    String tripId,
    String scheduleId,
    String routeId,
    String busId,
    LocalDate tripDate,
    String status,
    Instant actualStartTime,
    Instant actualEndTime,
    String notes
) {
    public static TripResponse from(Trip trip) {
        return new TripResponse(
            trip.getTripId(),
            trip.getScheduleId(),
            trip.getRouteId(),
            trip.getBusId(),
            trip.getTripDate(),
            trip.getStatus().name(),
            trip.getActualStartTime(),
            trip.getActualEndTime(),
            trip.getNotes()
        );
    }
}

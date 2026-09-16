package com.semicolons.smartcampustransport.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Request DTO for creating a new Trip.
 */
public record TripRequest(
    @NotBlank(message = "Schedule ID is required")
    String scheduleId,

    @NotNull(message = "Trip date is required")
    LocalDate tripDate,

    String busId,

    String notes
) {
}

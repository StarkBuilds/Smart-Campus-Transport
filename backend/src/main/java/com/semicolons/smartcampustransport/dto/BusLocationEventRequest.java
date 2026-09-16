package com.semicolons.smartcampustransport.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.semicolons.smartcampustransport.entity.Bus;
import jakarta.validation.constraints.*;

/**
 * Request DTO for GPS event ingestion.
 * Field names match the canonical GPS event contract EXACTLY.
 * Do NOT rename these fields without team approval.
 */
public record BusLocationEventRequest(
        @NotBlank(message = "bus_id is required")
        @JsonProperty("bus_id")
        String busId,

        @NotBlank(message = "route_id is required")
        @JsonProperty("route_id")
        String routeId,

        @NotBlank(message = "trip_id is required")
        @JsonProperty("trip_id")
        String tripId,

        @NotNull(message = "timestamp is required")
        @JsonProperty("timestamp")
        String timestamp,

        @NotNull(message = "latitude is required")
        @DecimalMin(value = "-90.0", message = "latitude must be >= -90.0")
        @DecimalMax(value = "90.0", message = "latitude must be <= 90.0")
        @JsonProperty("latitude")
        Double latitude,

        @NotNull(message = "longitude is required")
        @DecimalMin(value = "-180.0", message = "longitude must be >= -180.0")
        @DecimalMax(value = "180.0", message = "longitude must be <= 180.0")
        @JsonProperty("longitude")
        Double longitude,

        @DecimalMin(value = "0.0", message = "bearing must be >= 0.0")
        @DecimalMax(value = "360.0", message = "bearing must be <= 360.0")
        @JsonProperty("bearing")
        Double bearing,

        @DecimalMin(value = "0.0", message = "speed_kmh must be >= 0.0")
        @JsonProperty("speed_kmh")
        Double speedKmh,

        @DecimalMin(value = "0.0", message = "accuracy_m must be >= 0.0")
        @JsonProperty("accuracy_m")
        Double accuracyM,

        @NotNull(message = "status is required")
        @JsonProperty("status")
        String status,

        @JsonProperty("next_stop_id")
        String nextStopId
) {
    /**
     * Convert status string to enum.
     * Bean validation ensures the string is present; business validation checks enum validity.
     */
    public Bus.BusStatus toStatusEnum() {
        if (status == null) return null;
        try {
            return Bus.BusStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return null; // Invalid enum — caught by DataValidationService
        }
    }
}

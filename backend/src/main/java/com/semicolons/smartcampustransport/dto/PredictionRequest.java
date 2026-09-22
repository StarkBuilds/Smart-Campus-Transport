package com.semicolons.smartcampustransport.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Request payload sent to Python ML inference service for delay prediction.
 * Maps directly to ml/schemas.py PredictionRequest and BusTelemetry.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PredictionRequest(
        @JsonProperty("telemetry")
        Telemetry telemetry,

        @JsonProperty("recent_telemetry")
        List<Telemetry> recentTelemetry,

        @JsonProperty("route_length_km")
        Double routeLengthKm,

        @JsonProperty("road_distance_to_next_stop_km")
        Double roadDistanceToNextStopKm,

        @JsonProperty("scheduled_trip_start")
        String scheduledTripStart
) {
    /**
     * Vehicle telemetry observation matching ml/schemas.py BusTelemetry.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Telemetry(
            @JsonProperty("bus_id")
            String busId,

            @JsonProperty("route_id")
            String routeId,

            @JsonProperty("trip_id")
            String tripId,

            @JsonProperty("timestamp")
            String timestamp,

            @JsonProperty("latitude")
            Double latitude,

            @JsonProperty("longitude")
            Double longitude,

            @JsonProperty("bearing")
            Double bearing,

            @JsonProperty("speed_kmh")
            Double speedKmh,

            @JsonProperty("accuracy_m")
            Double accuracyM,

            @JsonProperty("status")
            String status,

            @JsonProperty("next_stop_id")
            String nextStopId
    ) {}
}

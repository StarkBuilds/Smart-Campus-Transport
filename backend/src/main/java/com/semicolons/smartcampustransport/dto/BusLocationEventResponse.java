package com.semicolons.smartcampustransport.dto;

import java.util.List;

/**
 * Response DTO for GPS event ingestion.
 */
public record BusLocationEventResponse(
    String eventId,
    String status,
    List<String> warnings,
    List<String> errors
) {
    public static BusLocationEventResponse accepted(String eventId) {
        return new BusLocationEventResponse(eventId, "ACCEPTED", null, null);
    }

    public static BusLocationEventResponse acceptedWithWarnings(String eventId, List<String> warnings) {
        return new BusLocationEventResponse(eventId, "ACCEPTED_WITH_WARNINGS", warnings, null);
    }

    public static BusLocationEventResponse rejected(List<String> errors) {
        return new BusLocationEventResponse(null, "REJECTED", null, errors);
    }
}

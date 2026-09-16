package com.semicolons.smartcampustransport.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Response DTO for ML delay prediction.
 * Used by GET /api/buses/{id}/prediction
 *
 * Note: confidence is OPTIONAL until ML team defines a defensible calculation.
 * Do not fabricate confidence values.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PredictionResponse(
        String busId,
        String routeId,
        Integer predictedDelayMinutes,
        String predictedEta,
        Double confidence,
        String modelVersion,
        String error
) {
    /**
     * Successful prediction response.
     */
    public static PredictionResponse success(String busId, String routeId,
                                             Integer predictedDelayMinutes,
                                             String predictedEta,
                                             Double confidence,
                                             String modelVersion) {
        return new PredictionResponse(busId, routeId, predictedDelayMinutes,
                predictedEta, confidence, modelVersion, null);
    }

    /**
     * Prediction unavailable (ML service down or error).
     */
    public static PredictionResponse unavailable(String busId, String routeId, String error) {
        return new PredictionResponse(busId, routeId, null, null, null, null, error);
    }
}

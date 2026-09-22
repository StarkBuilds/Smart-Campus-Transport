package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.client.MlPredictionClient;
import com.semicolons.smartcampustransport.dto.PredictionResponse;
import com.semicolons.smartcampustransport.service.MlPredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Admin-facing ML analytics endpoints. Proxies the existing Python ML service
 * without renaming or replacing the prediction architecture.
 */
@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
public class MlAnalyticsController {

    private final MlPredictionClient mlPredictionClient;
    private final MlPredictionService mlPredictionService;

    @GetMapping("/metadata")
    public ResponseEntity<Map<String, Object>> metadata() {
        Map<String, Object> meta = new HashMap<>(mlPredictionClient.getMetadata());
        // Attach live predicted delay for B01 when available
        mlPredictionService.getPredictionForBus("B01").ifPresent(pred -> {
            meta.put("currentPredictedDelayMinutes", pred.predictedDelayMinutes());
            meta.put("predictionStatus", pred.error() == null ? "AVAILABLE" : "UNAVAILABLE");
            if (pred.error() != null) {
                meta.put("predictionError", pred.error());
            }
        });
        return ResponseEntity.ok(meta);
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validate() {
        Map<String, Object> result = mlPredictionClient.runValidation();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/prediction/B01")
    public ResponseEntity<PredictionResponse> livePrediction() {
        return mlPredictionService.getPredictionForBus("B01")
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

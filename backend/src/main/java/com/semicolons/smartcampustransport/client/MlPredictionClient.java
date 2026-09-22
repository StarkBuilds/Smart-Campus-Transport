package com.semicolons.smartcampustransport.client;

import com.semicolons.smartcampustransport.dto.PredictionRequest;
import com.semicolons.smartcampustransport.dto.PredictionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

/**
 * HTTP client for communicating with Python ML inference service.
 * Handles timeouts, network errors, and falls back gracefully to PredictionResponse.unavailable().
 */
@Slf4j
@Component
public class MlPredictionClient {

    private final RestClient restClient;
    private final String mlServiceUrl;

    public MlPredictionClient(
            @Value("${ml.service.url:http://localhost:5000}") String mlServiceUrl,
            @Value("${ml.service.timeout-ms:5000}") int timeoutMs) {
        this.mlServiceUrl = mlServiceUrl;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(timeoutMs));

        this.restClient = RestClient.builder()
                .baseUrl(mlServiceUrl)
                .requestFactory(requestFactory)
                .build();
    }

    /**
     * Package-private constructor for unit testing with mocked/custom RestClient.
     */
    MlPredictionClient(RestClient restClient, String mlServiceUrl) {
        this.restClient = restClient;
        this.mlServiceUrl = mlServiceUrl;
    }

    /**
     * Send prediction request to ML service /predict endpoint.
     *
     * @param request the prediction request payload
     * @return PredictionResponse from ML service or unavailable fallback on failure
     */
    public PredictionResponse predict(PredictionRequest request) {
        String busId = (request != null && request.telemetry() != null) ? request.telemetry().busId() : "UNKNOWN";
        String routeId = (request != null && request.telemetry() != null) ? request.telemetry().routeId() : "UNKNOWN";

        if (request == null || request.telemetry() == null) {
            return PredictionResponse.unavailable(busId, routeId, "Invalid prediction request: telemetry missing");
        }

        try {
            log.debug("Sending prediction request to ML service at {}/predict for bus {}", mlServiceUrl, busId);
            PredictionResponse response = restClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(PredictionResponse.class);

            if (response != null) {
                return response;
            } else {
                log.warn("ML inference service returned null response body for bus {}", busId);
                return PredictionResponse.unavailable(busId, routeId, "Empty response from ML service");
            }
        } catch (RestClientException e) {
            log.warn("Failed to get prediction from ML service for bus {}: {}", busId, e.getMessage());
            return PredictionResponse.unavailable(busId, routeId, "ML service unavailable: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during ML prediction for bus {}: {}", busId, e.getMessage(), e);
            return PredictionResponse.unavailable(busId, routeId, "ML prediction error: " + e.getMessage());
        }
    }
}

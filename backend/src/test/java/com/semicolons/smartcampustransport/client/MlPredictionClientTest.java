package com.semicolons.smartcampustransport.client;

import com.semicolons.smartcampustransport.dto.PredictionRequest;
import com.semicolons.smartcampustransport.dto.PredictionResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class MlPredictionClientTest {

    @Test
    @DisplayName("Should return prediction response when ML service responds successfully")
    void testSuccessfulPrediction() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:5000");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MlPredictionClient client = new MlPredictionClient(builder.build(), "http://localhost:5000");

        server.expect(requestTo("http://localhost:5000/predict"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("Content-Type", "application/json"))
                .andRespond(withSuccess("""
                        {
                            "busId": "BUS-01",
                            "routeId": "ROUTE-1",
                            "predictedDelayMinutes": 4,
                            "predictedEta": "2026-09-20T14:35:00Z",
                            "confidence": null,
                            "modelVersion": "1.0.0",
                            "error": null
                        }
                        """, MediaType.APPLICATION_JSON));

        PredictionRequest request = new PredictionRequest(
                new PredictionRequest.Telemetry("BUS-01", "ROUTE-1", "TRIP-1", "2026-09-20T14:00:00Z",
                        12.97, 77.59, 90.0, 20.0, 5.0, "IN_SERVICE", "STOP-1"),
                null, null, null, null
        );

        PredictionResponse response = client.predict(request);

        assertNotNull(response);
        assertEquals("BUS-01", response.busId());
        assertEquals("ROUTE-1", response.routeId());
        assertEquals(4, response.predictedDelayMinutes());
        assertEquals("1.0.0", response.modelVersion());
        assertNull(response.error());
        server.verify();
    }

    @Test
    @DisplayName("Should return unavailable response when ML service returns 500 error")
    void testServiceErrorReturnsUnavailable() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:5000");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MlPredictionClient client = new MlPredictionClient(builder.build(), "http://localhost:5000");

        server.expect(requestTo("http://localhost:5000/predict"))
                .andRespond(withServerError());

        PredictionRequest request = new PredictionRequest(
                new PredictionRequest.Telemetry("BUS-01", "ROUTE-1", "TRIP-1", "2026-09-20T14:00:00Z",
                        12.97, 77.59, 90.0, 20.0, 5.0, "IN_SERVICE", "STOP-1"),
                null, null, null, null
        );

        PredictionResponse response = client.predict(request);

        assertNotNull(response);
        assertEquals("BUS-01", response.busId());
        assertEquals("ROUTE-1", response.routeId());
        assertNull(response.predictedDelayMinutes());
        assertNotNull(response.error());
        assertTrue(response.error().contains("ML service unavailable"));
        server.verify();
    }

    @Test
    @DisplayName("Should return unavailable when request is null or missing telemetry")
    void testNullRequestHandling() {
        MlPredictionClient client = new MlPredictionClient("http://localhost:5000", 1000);
        PredictionResponse response = client.predict(null);

        assertNotNull(response);
        assertNotNull(response.error());
        assertNull(response.predictedDelayMinutes());
    }
}

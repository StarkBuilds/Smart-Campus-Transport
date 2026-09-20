package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.PredictionResponse;
import com.semicolons.smartcampustransport.service.BusService;
import com.semicolons.smartcampustransport.service.MlPredictionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class BusControllerPredictionTest {

    @Mock
    private BusService busService;

    @Mock
    private MlPredictionService mlPredictionService;

    @InjectMocks
    private BusController busController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(busController).build();
    }

    @Test
    @DisplayName("GET /api/buses/{id}/prediction returns 200 with prediction payload")
    void testGetPredictionSuccess() throws Exception {
        PredictionResponse response = PredictionResponse.success(
                "BUS-01", "ROUTE-1", 5, "2026-09-20T14:40:00Z", null, "1.0.0"
        );
        when(mlPredictionService.getPredictionForBus("BUS-01")).thenReturn(Optional.of(response));

        mockMvc.perform(get("/api/buses/BUS-01/prediction")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.busId").value("BUS-01"))
                .andExpect(jsonPath("$.routeId").value("ROUTE-1"))
                .andExpect(jsonPath("$.predictedDelayMinutes").value(5))
                .andExpect(jsonPath("$.predictedEta").value("2026-09-20T14:40:00Z"))
                .andExpect(jsonPath("$.modelVersion").value("1.0.0"));
    }

    @Test
    @DisplayName("GET /api/buses/{id}/prediction returns 404 when bus does not exist")
    void testGetPredictionBusNotFound() throws Exception {
        when(mlPredictionService.getPredictionForBus("BUS-999")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/buses/BUS-999/prediction")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/buses/{id}/prediction returns 200 with error payload when ML prediction is unavailable")
    void testGetPredictionUnavailable() throws Exception {
        PredictionResponse response = PredictionResponse.unavailable("BUS-01", "ROUTE-1", "No telemetry available for bus BUS-01");
        when(mlPredictionService.getPredictionForBus("BUS-01")).thenReturn(Optional.of(response));

        mockMvc.perform(get("/api/buses/BUS-01/prediction")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.busId").value("BUS-01"))
                .andExpect(jsonPath("$.error").value("No telemetry available for bus BUS-01"));
    }
}

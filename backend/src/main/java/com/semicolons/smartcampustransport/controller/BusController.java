package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.BusResponse;
import com.semicolons.smartcampustransport.service.BusService;
import com.semicolons.smartcampustransport.service.BusSimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controller for bus queries.
 *
 * Auth: STUDENT and ADMIN
 * Frontend: BusMap component polls GET /api/buses every 10-15 seconds
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BusController {

    private final BusService busService;
    private final com.semicolons.smartcampustransport.service.MlPredictionService mlPredictionService;
    private final BusSimulationService busSimulationService;

    @GetMapping("/buses")
    public ResponseEntity<List<BusResponse>> getAllBuses() {
        return ResponseEntity.ok(busService.getAllBuses());
    }

    @GetMapping("/buses/{id}")
    public ResponseEntity<BusResponse> getBusById(
            @PathVariable("id") String busId,
            @RequestParam(value = "targetStopId", required = false) String targetStopId
    ) {
        return busService.getBusById(busId, targetStopId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/buses/{id}/location")
    public ResponseEntity<BusResponse.BusLocation> getBusLocation(@PathVariable("id") String busId) {
        return busService.getBusLocation(busId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/buses/{id}/prediction")
    public ResponseEntity<com.semicolons.smartcampustransport.dto.PredictionResponse> getPrediction(
            @PathVariable("id") String busId) {
        return mlPredictionService.getPredictionForBus(busId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Development/demo control: SIMULATE B01 along the fixed OSRM geometry.
     * reverse=false → SOURCE → DESTINATION; reverse=true → DESTINATION → SOURCE.
     */
    @PostMapping("/buses/{id}/simulate")
    public ResponseEntity<Map<String, Object>> simulateBus(
            @PathVariable("id") String busId,
            @RequestParam(value = "reverse", defaultValue = "false") boolean reverse
    ) {
        if (!"B01".equalsIgnoreCase(busId)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "ok", false,
                    "message", "Only B01 simulation is supported"
            ));
        }
        busSimulationService.startDemo(reverse);
        return ResponseEntity.ok(Map.of(
                "ok", true,
                "busId", "B01",
                "reverse", reverse,
                "delayMinutes", BusSimulationService.demoDelayMinutes,
                "message", reverse
                        ? "Simulating B01 DESTINATION → SOURCE on fixed OSRM path"
                        : "Simulating B01 SOURCE → DESTINATION on fixed OSRM path"
        ));
    }
}
